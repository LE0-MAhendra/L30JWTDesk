use serde::Serialize;
use std::fmt;

// Define our custom application error type.
//
// Debug:
// Allows us to print the complete error while debugging:
//
// println!("{:?}", error);
//
// Serialize:
// Allows Tauri/Serde to convert the error into JSON and send it
// to the frontend.
#[derive(Debug, Serialize)]
pub struct AppError {
    // Machine-readable error code.
    //
    // This is useful for the frontend because it can identify the exact
    // type of error without depending on the human-readable message.
    //
    // Examples:
    //
    // EMPTY_TOKEN
    // INVALID_TOKEN_STRUCTURE
    // INVALID_BASE64URL
    // INVALID_JSON
    // UNSUPPORTED_ALGORITHM
    //
    // The field is public so other modules can access it.
    pub code: String,

    // Human-readable description of the error.
    //
    // Example:
    //
    // "Expected 3 JWT segments but found 2"
    //
    // This can be displayed directly in the frontend.
    pub message: String,
}

// Add functions associated with AppError.
//
// `impl AppError` means:
//
// "Define behavior/functions that belong to AppError."
impl AppError {
    // Constructor-like function for AppError.
    //
    // Rust does not have a special constructor keyword.
    // `new` is simply the conventional name used for creating a new value.
    //
    // We call it like:
    //
    // AppError::new(
    //     "EMPTY_TOKEN",
    //     "Token cannot be empty",
    // );
    //
    // `impl Into<String>` lets us pass either:
    //
    // &str
    // String
    // values created using format!()
    //
    // without manually calling `.to_string()` every time.
    //
    // `-> Self` means this function returns an AppError.
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        // `Self` here means AppError.
        //
        // So this is equivalent to:
        //
        // AppError {
        //     ...
        // }
        Self {
            // Convert whatever string-like value was passed for `code`
            // into an owned String.
            code: code.into(),

            // Convert whatever string-like value was passed for `message`
            // into an owned String.
            message: message.into(),
        }
    }
}

// Implement Rust's Display trait for AppError.
//
// Display defines how AppError should look when converted into
// human-readable text.
//
// For example:
//
// let error = AppError::new(
//     "INVALID_TOKEN",
//     "Token is malformed",
// );
//
// println!("{}", error);
//
// Output:
//
// INVALID_TOKEN: Token is malformed
impl fmt::Display for AppError {
    // This `fmt` function is required by the Display trait.
    //
    // `&self`
    // means the current AppError instance.
    //
    // `f` is a formatter provided by Rust.
    //
    // `fmt::Result` tells Rust whether writing the formatted output
    // succeeded or failed.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Write the error code and message into the formatter.
        //
        // Example:
        //
        // code:
        // INVALID_TOKEN
        //
        // message:
        // Token is malformed
        //
        // Result:
        //
        // INVALID_TOKEN: Token is malformed
        write!(f, "{}: {}", self.code, self.message)
    }
}

// Tell Rust that AppError is an official error type.
//
// The standard Error trait is:
// std::error::Error
//
// We don't need to define extra methods here, so the body is empty.
//
// By implementing this trait, AppError can participate in Rust's normal
// error-handling system and can be used with:
//
// Result<T, AppError>
//
// It also makes it compatible with more generic error handling such as:
//
// Box<dyn std::error::Error>
impl std::error::Error for AppError {}
