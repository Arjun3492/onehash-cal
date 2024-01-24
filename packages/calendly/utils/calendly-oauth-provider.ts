import type { AccessTokenErrorResponse, AccessTokenSuccessResponse } from "./calendly";

export default class CalendlyOAuthProvider {
  private oauthConfig: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    oauthUrl: string;
  };

  constructor(_oauthConfig: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    oauthUrl: string;
  }) {
    const { clientId, clientSecret, redirectUri, oauthUrl } = _oauthConfig;
    if (!clientId || !clientSecret || !redirectUri || !oauthUrl)
      throw new Error("Missing Calendly OAuth configuration");
    this.oauthConfig = {
      clientId,
      clientSecret,
      redirectUri,
      oauthUrl,
    };
  }

  private getBasicAuthHeader(): string {
    const { clientId, clientSecret } = this.oauthConfig;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    return `Basic ${credentials}`;
  }

  public getAuthorizationUrl(): string {
    const { clientId, redirectUri, oauthUrl } = this.oauthConfig;
    const queryParams = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
    };

    return `${oauthUrl}/authorize?${new URLSearchParams(queryParams)}`;
  }

  public getAccessToken = async (code: string): Promise<AccessTokenSuccessResponse> => {
    const { oauthUrl, redirectUri } = this.oauthConfig;

    const tokenData: Record<string, string> = {
      code,
      redirect_uri: redirectUri ?? "",
      grant_type: "authorization_code",
    };

    try {
      const url = `${oauthUrl}/token`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: this.getBasicAuthHeader(),
        },
        body: new URLSearchParams(tokenData),
      });

      if (!response.ok) {
        const errorData: AccessTokenErrorResponse = await response.json();
        console.error("Error fetching access token:", errorData.error, errorData.error_description);
        throw new Error(errorData.error || "Error fetching access token");
      }
      const data: AccessTokenSuccessResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching access token:", error.message);
      } else {
        console.error("Error fetching access token:", String(error));
      }
      throw error;
    }
  };

  public introspectToken = async (token: { accessToken: string; refreshToken: string }) => {
    const { oauthUrl, clientId, clientSecret } = this.oauthConfig;
    const tokenData: Record<string, string> = {
      token: token.accessToken,
      client_id: clientId,
      client_secret: clientSecret,
    };
    try {
      const url = `${oauthUrl}/introspect`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(tokenData),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error("Error introspecting access token:", data.error, data.error_description);
        throw new Error(data.error || "Error introspecting access token");
      }
      return data.active;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching access token:", error.message);
      } else {
        console.error("Error fetching access token:", String(error));
      }
      throw error;
    }
  };
}
