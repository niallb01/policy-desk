# Widespread 403 after a deploy

Use this page when many users start getting HTTP 403 immediately after a release. A single user who cannot sign in is not this incident.

## First check

Confirm the auth service version matches the version named in that release's notes. Then confirm whether API tokens were rotated in the same deploy. Those two checks come before any customer is told to reset a password.

## Second check

If the version matches and tokens were not rotated, check clock skew between the auth service and the app servers. A skew over 60 seconds makes valid tokens look expired, and the client shows that as a 403.

## What to tell the customer

Tell them we are investigating a release issue and we will update them. Do not ask every affected user to reset their password. Password resets do not fix a bad auth deploy.
