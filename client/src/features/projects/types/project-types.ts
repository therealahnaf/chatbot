export interface Project {
    id: string
    title: string
    created_at: string
    updated_at: string
}

export interface ProjectCreate {
    title: string
}

export interface ProjectUpdate {
    title: string
}
