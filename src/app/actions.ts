"use server"

export async function triggerServerError() {
  // This error will appear in Node.js terminal
  throw new Error("Server runtime error triggered from clicker!")
}
