const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://166.0.242.53:1100";

  async function apiRequest(
  endpoint: string,
  options?: RequestInit
) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error: any = new Error(
      data?.message || data?.error || `Error ${res.status}`
    );

    error.status = res.status;
    error.data = data;

    throw error;
  }

  return data;
}



export function registerUser(data: any) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}




export function login(data: any) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}





export function loginEditor(data: any) {
  return apiRequest("/api/auth/login-editors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
      export function verifyPhone(data:any){
        return apiRequest("/api/auth/verify-phone",{
                    method:"POST",
                    body:JSON.stringify(data)

        })

       
}


export function resendPhoneOtp(data: any) {
  return apiRequest("/api/auth/resend-phone-otp", {
    method: "POST",
    body: JSON.stringify(data),
  });
}


export function ForgotPassword(data:any){
  return apiRequest("/api/auth/forgot-password",{
    method:"POST",
    body:JSON.stringify(data),
  });
  
}


export function ResetPassword(data:any){
  return apiRequest("/api/auth/reset-password",{
    method:"POST",
    body:JSON.stringify(data),
  });
}


