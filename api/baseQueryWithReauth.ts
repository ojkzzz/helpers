// import { fetchBaseQuery } from "@reduxjs/toolkit/query";
// import { setAuth } from "./auth/slice/auth.slice";
// import { tokens } from "../common/tokens/tokens";
// import { API_URL } from "../common/api/api";
// import { toast } from "react-toastify";
// import { AppDispatch } from "./store";

//for rtk-q
const prepareHeaders = (headers: any) => {
  const access_token = localStorage.getItem(tokens.ACCESS_TOKEN);
  if (access_token) {
    headers.set("Authorization", `Bearer ${access_token}`);
  }
  return headers;
};

const baseQuery = fetchBaseQuery({
  prepareHeaders: prepareHeaders,
});

export const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    const refreshResult: any = await baseQuery(
      {
        url: `${API_URL}/auth/refresh`,
        method: "POST",
        headers: {
          "Authorization-Refresh": `Bearer ${localStorage.getItem(tokens.REFRESH_TOKEN)}`,
        },
      },
      api,
      extraOptions
    );

    if (refreshResult.data.message) {
      localStorage.setItem(tokens.ACCESS_TOKEN, refreshResult.data.message.access_token);
      localStorage.setItem(tokens.REFRESH_TOKEN, refreshResult.data.message.refresh_token);
      api.dispatch(setAuth(true));
      result = await baseQuery(args, api, extraOptions);
    } else {
      localStorage.removeItem(tokens.ACCESS_TOKEN);
      localStorage.removeItem(tokens.REFRESH_TOKEN);
      api.dispatch(setAuth(false));
    }
  }
  return result;
};

// for native fetch
export const baseFetchWithReauth = async (
  api: RequestInfo | URL,
  args: RequestInit | undefined,
  dispatch: AppDispatch
) => {
  try {
    const accessToken = localStorage.getItem(tokens.ACCESS_TOKEN);
    if (!accessToken) {
      throw new Error("Access token not found");
    }

    let response = await fetch(api, {
      ...args,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage[tokens.ACCESS_TOKEN]}`,
      },
    });

    if (response.status === 401) {
      const refreshToken = localStorage.getItem(tokens.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error("Refresh token not found");
      }

      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Authorization-Refresh": `Bearer ${refreshToken}`,
        },
      });

      if (refreshResponse.ok) {
        const refreshResult = await refreshResponse.json();

        localStorage.setItem(tokens.ACCESS_TOKEN, refreshResult.message.access_token);
        localStorage.setItem(tokens.REFRESH_TOKEN, refreshResult.message.refresh_token);
        dispatch(setAuth(true));

        // Повторно выполняем базовый запрос с обновленным токеном
        response = await fetch(api, {
          ...args,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage[tokens.ACCESS_TOKEN]}`,
          },
        });
      } else {
        localStorage.removeItem(tokens.ACCESS_TOKEN);
        localStorage.removeItem(tokens.REFRESH_TOKEN);
        dispatch(setAuth(false));
        throw new Error("Ошибка обновления токена");
      }
    }

    // Возвращаем ответ базового запроса
    return response;
  } catch (error: any) {
    console.error(error);
    toast.warning(
      error.data && error.data.message ? error.data.message : error.message ? error.message : error
    );
    throw error;
  }
};
