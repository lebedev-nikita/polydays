-- migrate:up
CREATE TABLE "jwks" ("id" TEXT PRIMARY KEY NOT NULL,"publicKey" TEXT NOT NULL,"privateKey" TEXT NOT NULL,"createdAt" TEXT NOT NULL,"expiresAt" TEXT,"alg" TEXT,"crv" TEXT);
CREATE TABLE "oauthClient" ("id" TEXT PRIMARY KEY NOT NULL,"clientId" TEXT NOT NULL UNIQUE,"clientSecret" TEXT,"clientDiscoveryId" TEXT,"disabled" INTEGER,"skipConsent" INTEGER,"enableEndSession" INTEGER,"subjectType" TEXT,"scopes" TEXT,"clientCredentialsScopes" TEXT,"userId" TEXT REFERENCES "user" ("id") ON DELETE CASCADE,"createdAt" TEXT,"updatedAt" TEXT,"name" TEXT,"uri" TEXT,"icon" TEXT,"contacts" TEXT,"tos" TEXT,"policy" TEXT,"softwareId" TEXT,"softwareVersion" TEXT,"softwareStatement" TEXT,"redirectUris" TEXT NOT NULL,"postLogoutRedirectUris" TEXT,"backchannelLogoutUri" TEXT,"backchannelLogoutSessionRequired" INTEGER,"tokenEndpointAuthMethod" TEXT,"applicationType" TEXT,"jwks" TEXT,"jwksUri" TEXT,"grantTypes" TEXT,"responseTypes" TEXT,"requirePKCE" INTEGER,"dpopBoundAccessTokens" INTEGER,"referenceId" TEXT,"metadata" TEXT);
CREATE TABLE "oauthResource" ("id" TEXT PRIMARY KEY NOT NULL,"identifier" TEXT NOT NULL UNIQUE,"name" TEXT NOT NULL,"accessTokenTtl" REAL,"refreshTokenTtl" REAL,"signingAlgorithm" TEXT,"signingKeyId" TEXT,"allowedScopes" TEXT,"customClaims" TEXT,"dpopBoundAccessTokensRequired" INTEGER,"disabled" INTEGER,"createdAt" TEXT,"updatedAt" TEXT,"policyVersion" REAL,"metadata" TEXT);
CREATE TABLE "oauthClientResource" ("id" TEXT PRIMARY KEY NOT NULL,"clientId" TEXT NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,"resourceId" TEXT NOT NULL REFERENCES "oauthResource" ("identifier") ON DELETE CASCADE,"metadata" TEXT,"createdAt" TEXT);
CREATE TABLE "oauthRefreshToken" ("id" TEXT PRIMARY KEY NOT NULL,"token" TEXT NOT NULL UNIQUE,"clientId" TEXT NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,"sessionId" TEXT REFERENCES "session" ("id") ON DELETE SET NULL,"userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,"referenceId" TEXT,"authorizationCodeId" TEXT,"resources" TEXT,"requestedUserInfoClaims" TEXT,"expiresAt" TEXT,"createdAt" TEXT,"revoked" TEXT,"rotatedAt" TEXT,"rotationReplayResponse" TEXT,"rotationReplayExpiresAt" TEXT,"authTime" TEXT,"confirmation" TEXT,"scopes" TEXT NOT NULL);
CREATE TABLE "oauthAccessToken" ("id" TEXT PRIMARY KEY NOT NULL,"token" TEXT UNIQUE,"clientId" TEXT NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,"sessionId" TEXT REFERENCES "session" ("id") ON DELETE SET NULL,"userId" TEXT REFERENCES "user" ("id") ON DELETE CASCADE,"referenceId" TEXT,"authorizationCodeId" TEXT,"resources" TEXT,"requestedUserInfoClaims" TEXT,"refreshId" TEXT REFERENCES "oauthRefreshToken" ("id") ON DELETE CASCADE,"expiresAt" TEXT,"createdAt" TEXT,"revoked" TEXT,"confirmation" TEXT,"scopes" TEXT NOT NULL);
CREATE TABLE "oauthConsent" ("id" TEXT PRIMARY KEY NOT NULL,"clientId" TEXT NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,"userId" TEXT REFERENCES "user" ("id") ON DELETE CASCADE,"referenceId" TEXT,"resources" TEXT,"requestedUserInfoClaims" TEXT,"scopes" TEXT NOT NULL,"createdAt" TEXT,"updatedAt" TEXT);
CREATE TABLE "oauthClientAssertion" ("id" TEXT PRIMARY KEY NOT NULL,"expiresAt" TEXT NOT NULL);

CREATE TABLE polydays_commands (user_id TEXT NOT NULL, id TEXT NOT NULL, input JSON NOT NULL, result JSON NOT NULL, PRIMARY KEY (user_id, id));

-- migrate:down
DROP TABLE polydays_commands;
DROP TABLE "oauthClientAssertion";
DROP TABLE "oauthConsent";
DROP TABLE "oauthAccessToken";
DROP TABLE "oauthRefreshToken";
DROP TABLE "oauthClientResource";
DROP TABLE "oauthResource";
DROP TABLE "oauthClient";
DROP TABLE "jwks";
