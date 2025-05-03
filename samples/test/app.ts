import * as cookie from "cookie";
import escapeHtml from "escape-html";
import http from "http";
import url from "url";

function deleteCookieHeader(name: string) {
  return cookie.serialize(name, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
}

function onRequest(req: any, res: any) {
  const parsedUrl = url.parse(req.url, true, true);
  const query = parsedUrl.query;

  // Handle cookie deletion
  if (parsedUrl.pathname === "/delete") {
    const cookies = cookie.parse(req.headers.cookie || "");
    let cookiesToDelete: string[] = [];

    if (query && typeof query.name === "string") {
      // Delete a specific cookie
      if (cookies[query.name]) {
        cookiesToDelete.push(deleteCookieHeader(query.name));
      }
    } else {
      // Delete all cookies
      cookiesToDelete = Object.keys(cookies).map(deleteCookieHeader);
    }

    if (cookiesToDelete.length > 0) {
      res.setHeader("Set-Cookie", cookiesToDelete);
    }

    // Redirect back after deleting cookies
    res.statusCode = 302;
    res.setHeader("Location", req.headers.referer || "/");
    res.end();
    return;
  }

  // Parse the query string
  if (query && query.name) {
    // Set two cookies: "name" and "backup"
    const cookiesToSet = [
      cookie.serialize("name", String(query.name), {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
      }),
      cookie.serialize("backup", new Date().toISOString(), {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
      }),
    ];

    res.setHeader("Set-Cookie", cookiesToSet);

    // Redirect back after setting cookies
    res.statusCode = 302;
    res.setHeader("Location", req.headers.referer || "/");
    res.end();
    return;
  }

  // Parse the cookies on the request
  const cookies = cookie.parse(req.headers.cookie || "");

  // Get the visitor name set in the cookie
  const name = cookies.name;

  res.setHeader("Content-Type", "text/html; charset=UTF-8");

  if (name) {
    res.write("<p>Welcome back, <b>" + escapeHtml(name) + "</b>!</p>");
  } else {
    res.write("<p>Hello, new visitor!</p>");
  }

  // Show all cookies
  res.write("<h3>All Cookies:</h3><ul>");
  for (const [key, value] of Object.entries(cookies)) {
    res.write(`<li><b>${escapeHtml(key)}</b>: ${escapeHtml(value)}</li>`);
  }
  res.write("</ul>");

  res.write('<form method="GET">');
  res.write(
    '<input placeholder="enter your name" name="name"> <input type="submit" value="Set Name">'
  );
  res.write("</form>");
  res.write(
    '<form method="GET" action="/delete"><input type="submit" value="Delete All Cookies"></form>'
  );
  res.write(
    '<form method="GET" action="/delete"><input name="name" placeholder="cookie name"><input type="submit" value="Delete Cookie By Name"></form>'
  );
  res.end();
}

http.createServer(onRequest).listen(5000);
