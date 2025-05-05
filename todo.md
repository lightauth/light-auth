# TODO

## Checking expration

Check expiration of the session everytime it's accessed: **DONE**

## Session lifetime

However, for less critical websites, such as a social media app, it would be annoying for users if they had to sign in every single day. A good practice here is to set the expiration to a reasonable time, like 30 days, but extend the expiration whenever the session is used. For example, sessions may expire in 30 days by default, but the expiration gets pushed back 30 days when it's used within 15 days before expiration. This effectively invalidates sessions for inactive users, while keeping active users signed in.

You can also combine both approaches. For example, you can set the expiration to an hour and extend it every 30 minutes but set an absolute expiration of 12 hours so sessions won't last for longer than that.

## Cross-site request forgery (CSRF)

[The Copnehagen book](https://thecopenhagenbook.com/csrf)

## Encrypt decrypt

if decrypt a session fail, remove the session cookie

## User Adapter

Let user adapter to be optional, and check is user adapter exists or not
dont break if not exists

## Token response

handle errors when tokens back from provider

## callback

handle callback correctly
