use include_dir::{include_dir, Dir};
use std::{
    io::{self, Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    process::Command,
    thread,
};

static ASSETS: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../out");

fn main() -> io::Result<()> {
    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    let addr = listener.local_addr()?;
    let launch_url = format!("http://{addr}/app/");

    println!("Pulse Revoke is running at {launch_url}");
    println!("Press Ctrl+C or close this window to stop the local server.");

    if let Err(error) = open_default_browser(&launch_url) {
        eprintln!("Could not open the default browser automatically: {error}");
        eprintln!("Open this URL manually: {launch_url}");
    }

    serve(listener, addr)
}

fn open_default_browser(url: &str) -> io::Result<()> {
    Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn()
        .map(|_| ())
}

fn serve(listener: TcpListener, addr: SocketAddr) -> io::Result<()> {
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(|| handle_connection(stream));
            }
            Err(error) => {
                eprintln!("Connection error on {addr}: {error}");
            }
        }
    }

    Ok(())
}

fn handle_connection(mut stream: TcpStream) {
    let mut buffer = [0_u8; 4096];
    let read = match stream.read(&mut buffer) {
        Ok(read) => read,
        Err(_) => return,
    };

    let request = String::from_utf8_lossy(&buffer[..read]);
    let mut request_line = request
        .lines()
        .next()
        .unwrap_or_default()
        .split_whitespace();
    let method = request_line.next().unwrap_or_default();
    let path = request_line.next().unwrap_or("/");

    if method != "GET" && method != "HEAD" {
        write_response(
            &mut stream,
            "405 Method Not Allowed",
            "text/plain; charset=utf-8",
            b"Method not allowed.",
            method == "HEAD",
        );
        return;
    }

    let path = path.split('?').next().unwrap_or("/");

    if path == "/app" {
        write_redirect(&mut stream, "/app/");
        return;
    }

    match resolve_asset(path) {
        Some((content_type, body)) => {
            write_response(&mut stream, "200 OK", content_type, body, method == "HEAD");
        }
        None => write_response(
            &mut stream,
            "404 Not Found",
            "text/plain; charset=utf-8",
            b"Not found.",
            method == "HEAD",
        ),
    }
}

fn resolve_asset(path: &str) -> Option<(&'static str, &'static [u8])> {
    let normalized = normalize_path(path)?;
    let file = ASSETS.get_file(&normalized)?;
    Some((content_type(&normalized), file.contents()))
}

fn normalize_path(path: &str) -> Option<String> {
    if path.contains("..") || path.contains('\\') {
        return None;
    }

    let trimmed = path.trim_start_matches('/');
    let normalized = match trimmed {
        "" => "index.html".to_string(),
        path if path.ends_with('/') => format!("{path}index.html"),
        path => path.to_string(),
    };

    Some(normalized)
}

fn content_type(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or_default() {
        "css" => "text/css; charset=utf-8",
        "html" => "text/html; charset=utf-8",
        "ico" => "image/x-icon",
        "js" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "txt" => "text/plain; charset=utf-8",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

fn write_redirect(stream: &mut TcpStream, location: &str) {
    let headers = format!(
        "HTTP/1.1 302 Found\r\nLocation: {location}\r\nContent-Length: 0\r\nConnection: close\r\n{}\r\n\r\n",
        security_headers(),
    );
    let _ = stream.write_all(headers.as_bytes());
}

fn write_response(
    stream: &mut TcpStream,
    status: &str,
    content_type: &str,
    body: &[u8],
    head_only: bool,
) {
    let headers = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n{}\r\n\r\n",
        body.len(),
        security_headers(),
    );

    let _ = stream.write_all(headers.as_bytes());
    if !head_only {
        let _ = stream.write_all(body);
    }
}

fn security_headers() -> &'static str {
    "Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; frame-src 'self' https:; worker-src 'self' blob:\r\nReferrer-Policy: strict-origin-when-cross-origin\r\nX-Content-Type-Options: nosniff"
}
