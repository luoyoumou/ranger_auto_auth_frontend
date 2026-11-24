import request from './request'

export function login(data) {
  // FastAPI OAuth2PasswordRequestForm 要求用 x-www-form-urlencoded 格式
  const formData = new URLSearchParams()
  formData.append('username', data.username)
  formData.append('password', data.password)
  
  return request.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}