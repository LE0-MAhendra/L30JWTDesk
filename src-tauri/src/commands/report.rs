use crate::models::security::{DiagnosticReportRequest, ReportMode};

#[tauri::command]
pub fn generate_diagnostic_report(request: DiagnosticReportRequest) -> String {
    let decision = match request.validation.decision {
        crate::models::security::ClaimValidationState::Fail => "Reject",
        crate::models::security::ClaimValidationState::Warning => "Review",
        crate::models::security::ClaimValidationState::Pass => "Accept",
    };

    let mut report = format!(
        "L30JWTDesk diagnostic report\nDecision: {decision}\nPrimary failure: {}\n",
        request
            .validation
            .primary_failure
            .as_deref()
            .unwrap_or("None")
    );

    if matches!(request.mode, ReportMode::Summary) {
        return report;
    }

    for step in request.validation.steps {
        let detail = if matches!(request.mode, ReportMode::Full) {
            step.detail
        } else {
            redact(&step.detail)
        };
        report.push_str(&format!(
            "{}: {} - {}\n",
            step.label,
            format!("{:?}", step.state).to_uppercase(),
            detail
        ));
    }

    report
}

fn redact(input: &str) -> String {
    input
        .split_once("received ")
        .map(|(before, _)| format!("{before}received [redacted]"))
        .unwrap_or_else(|| input.to_string())
}

#[cfg(test)]
mod tests {
    use super::generate_diagnostic_report;
    use crate::models::security::{
        ClaimValidationResult, ClaimValidationState, ClaimValidationStep, DiagnosticReportRequest,
        ReportMode,
    };

    #[test]
    fn redacts_received_values() {
        let report = generate_diagnostic_report(DiagnosticReportRequest {
            mode: ReportMode::Redacted,
            validation: ClaimValidationResult {
                decision: ClaimValidationState::Fail,
                primary_failure: Some("Audience".to_string()),
                steps: vec![ClaimValidationStep {
                    label: "Audience".to_string(),
                    state: ClaimValidationState::Fail,
                    detail: "Expected api · received web".to_string(),
                }],
            },
        });

        assert!(report.contains("received [redacted]"));
        assert!(!report.contains("received web"));
    }
}
