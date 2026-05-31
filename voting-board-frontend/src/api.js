import axios from 'axios'

const BASE_URL = 'http://127.0.0.1:8001/api' // Better if this was an environmental variable

const api = axios.create({
    baseURL: BASE_URL,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Token ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token')
            window.location.href = '/?reason=session_expired'
        }
        return Promise.reject(error)
    }
)

export const login = (username, password) =>
    api.post('/auth/login/', {username, password})

export const getIdeas = (sort) =>
    api.get(`/ideas/?sort=${sort}`)

export const createIdea = (title, description) =>
    api.post('/ideas/', {title, description})

export const castVote = (ideaId) =>
    api.post(`/ideas/${ideaId}/vote/`)

export const removeVote = (ideaId) =>
    api.delete(`/ideas/${ideaId}/vote/`)