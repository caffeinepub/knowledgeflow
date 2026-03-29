import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Project {
    id: string;
    owner: Principal;
    name: string;
    createdAt: bigint;
    description: string;
}
export interface UserProfile {
    name: string;
}
export interface UserLLMSettings {
    apiKey: string;
    model: string;
}
export interface ChatMessage {
    role: string;
    content: string;
}
export interface Note {
    id: string;
    title: string;
    body: string;
    updatedAt: bigint;
    projectId: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    callLLM(messages: Array<ChatMessage>, contextNoteIds: Array<string>): Promise<string>;
    createNote(projectId: string, title: string, body: string): Promise<string>;
    createProject(name: string, description: string): Promise<string>;
    deleteNote(noteId: string): Promise<void>;
    deleteProject(projectId: string): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLLMSettings(): Promise<UserLLMSettings | null>;
    getNotes(projectId: string): Promise<Array<Note>>;
    getProjects(): Promise<Array<Project>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveLLMSettings(apiKey: string, model: string): Promise<void>;
    updateNote(noteId: string, title: string, body: string): Promise<void>;
}
