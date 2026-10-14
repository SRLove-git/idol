let currentUserRequest

async function responseMessage(response) {
  const data = await response.json().catch(() => ({}))
  return Array.isArray(data?.message) ? data.message[0] : data?.message
}

/**
 * 页面头部和账号页共用一次登录态查询，避免同时请求 /auth/me。
 * 只有明确的未认证响应才按游客处理；限流或服务异常不能伪装成“未登录”。
 */
export function getCurrentUser() {
  if (!currentUserRequest) {
    currentUserRequest = fetch('/api/auth/me', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401 || response.status === 403) return null
      if (!response.ok) throw new Error((await responseMessage(response)) || 'ACCOUNT_STATUS_UNAVAILABLE')
      return response.json()
    })
  }
  return currentUserRequest
}
