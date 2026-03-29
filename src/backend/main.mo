import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Text "mo:core/Text";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Outcall "http-outcalls/outcall";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let projects : Map.Map<Text, Project> = Map.empty<Text, Project>();
  var notes : Map.Map<Text, Note> = Map.empty<Text, Note>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userLLMSettings = Map.empty<Principal, UserLLMSettings>();

  type Project = {
    id : Text;
    owner : Principal;
    name : Text;
    description : Text;
    createdAt : Int;
  };

  type Note = {
    id : Text;
    projectId : Text;
    title : Text;
    body : Text;
    updatedAt : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  public type UserLLMSettings = {
    apiKey : Text;
    model : Text;
  };

  public type ChatMessage = {
    role : Text;
    content : Text;
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  // USER PROFILE

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  // LLM SETTINGS

  public shared ({ caller }) func saveLLMSettings(apiKey : Text, model : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userLLMSettings.add(caller, { apiKey; model });
  };

  public query ({ caller }) func getLLMSettings() : async ?UserLLMSettings {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userLLMSettings.get(caller);
  };

  // LLM CALL

  public shared ({ caller }) func callLLM(messages : [ChatMessage], contextNoteIds : [Text]) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };

    let settings = switch (userLLMSettings.get(caller)) {
      case (null) { Runtime.trap("LLM settings not configured. Please set your API key in Settings.") };
      case (?s) { s };
    };

    // Build context text from selected notes
    var contextText = "";
    for (noteId in contextNoteIds.vals()) {
      switch (notes.get(noteId)) {
        case (?note) {
          switch (projects.get(note.projectId)) {
            case (?project) {
              if (project.owner == caller) {
                if (contextText.size() > 0) { contextText := contextText # "\n\n" };
                contextText := contextText # "### " # note.title # "\n" # note.body;
              };
            };
            case (null) {};
          };
        };
        case (null) {};
      };
    };

    // Build JSON manually using unicode escapes to avoid char literal ambiguity
    let bs = Text.fromChar('\u{5c}'); // backslash
    let dq = Text.fromChar('\u{22}'); // double quote

    let jsonStr = func(s : Text) : Text {
      var t = s;
      t := t.replace(#char('\u{5c}'), bs # bs);
      t := t.replace(#char('\u{22}'), bs # dq);
      t := t.replace(#char('\u{0a}'), bs # "n");
      t := t.replace(#char('\u{0d}'), bs # "r");
      t := t.replace(#char('\u{09}'), bs # "t");
      dq # t # dq;
    };

    // Build messages array JSON
    var msgJson = "[";
    var firstMsg = true;

    if (contextText.size() > 0) {
      msgJson := msgJson # "{" # dq # "role" # dq # ":" # jsonStr("system") # "," # dq # "content" # dq # ":" # jsonStr(contextText) # "}";
      firstMsg := false;
    };

    for (msg in messages.vals()) {
      if (not firstMsg) { msgJson := msgJson # "," } else { firstMsg := false };
      msgJson := msgJson # "{" # dq # "role" # dq # ":" # jsonStr(msg.role) # "," # dq # "content" # dq # ":" # jsonStr(msg.content) # "}";
    };
    msgJson := msgJson # "]";

    let requestBody = "{" # dq # "model" # dq # ":" # jsonStr(settings.model) # "," # dq # "messages" # dq # ":" # msgJson # "}";

    let headers : [Outcall.Header] = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # settings.apiKey },
    ];

    let responseText = await Outcall.httpPostRequest(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      headers,
      requestBody,
      transform,
    );

    extractContent(responseText);
  };

  // PROJECTS

  public shared ({ caller }) func createProject(name : Text, description : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (name.size() == 0) { Runtime.trap("Project name cannot be empty") };
    let projectId = generateId(caller, name);
    projects.add(projectId, { id = projectId; owner = caller; name; description; createdAt = Time.now() });
    projectId;
  };

  public query ({ caller }) func getProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    projects.values().toArray().filter<Project>(func(p) { p.owner == caller });
  };

  public shared ({ caller }) func deleteProject(projectId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (projects.get(projectId)) {
      case (null) { Runtime.trap("Project does not exist") };
      case (?project) {
        if (project.owner != caller) { Runtime.trap("Unauthorized") };
        projects.remove(projectId);
        notes := notes.filter<Text, Note>(func(_, n) { n.projectId != projectId });
      };
    };
  };

  // NOTES

  public shared ({ caller }) func createNote(projectId : Text, title : Text, body : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (projects.get(projectId)) {
      case (null) { Runtime.trap("Project does not exist") };
      case (?project) {
        if (project.owner != caller) { Runtime.trap("Unauthorized") };
        if (title.size() == 0) { Runtime.trap("Note title cannot be empty") };
        let noteId = generateId(caller, title);
        notes.add(noteId, { id = noteId; projectId; title; body; updatedAt = Time.now() });
        noteId;
      };
    };
  };

  public query ({ caller }) func getNotes(projectId : Text) : async [Note] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (projects.get(projectId)) {
      case (null) { Runtime.trap("Project does not exist") };
      case (?project) {
        if (project.owner != caller) { Runtime.trap("Unauthorized") };
        notes.values().toArray().filter<Note>(func(n) { n.projectId == projectId });
      };
    };
  };

  public shared ({ caller }) func updateNote(noteId : Text, title : Text, body : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (notes.get(noteId)) {
      case (null) { Runtime.trap("Note does not exist") };
      case (?note) {
        switch (projects.get(note.projectId)) {
          case (null) { Runtime.trap("Project does not exist") };
          case (?project) {
            if (project.owner != caller) { Runtime.trap("Unauthorized") };
            notes.add(noteId, { id = note.id; projectId = note.projectId; title; body; updatedAt = Time.now() });
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteNote(noteId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (notes.get(noteId)) {
      case (null) { Runtime.trap("Note does not exist") };
      case (?note) {
        switch (projects.get(note.projectId)) {
          case (null) { Runtime.trap("Project does not exist") };
          case (?project) {
            if (project.owner != caller) { Runtime.trap("Unauthorized") };
            notes.remove(noteId);
          };
        };
      };
    };
  };

  // HELPERS

  func generateId(caller : Principal, seed : Text) : Text {
    let timestamp = Time.now();
    caller.toText() # "-" # seed # "-" # timestamp.toText();
  };

  func extractContent(json : Text) : Text {
    // GLM response: {"choices":[{"message":{"role":"assistant","content":"..."}}]}
    let marker = "\"content\":\"";
    let parts = json.split(#text(marker)).toArray();
    if (parts.size() < 2) {
      return "Error parsing LLM response: " # json;
    };
    // Last occurrence is the assistant content
    let afterMarker = parts[parts.size() - 1];
    var result = "";
    var prevWasBackslash = false;
    var done = false;
    for (c in afterMarker.chars()) {
      if (not done) {
        if (prevWasBackslash) {
          result := result # Text.fromChar(c);
          prevWasBackslash := false;
        } else if (c == '\u{5c}') {
          prevWasBackslash := true;
        } else if (c == '\u{22}') {
          done := true;
        } else {
          result := result # Text.fromChar(c);
        };
      };
    };
    result := result.replace(#text("\\n"), "\n");
    result := result.replace(#text("\\t"), "\t");
    result;
  };
};
