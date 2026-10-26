# Security policy

## Supported versions

Proba Protocol is pre-1.0. Security fixes are made in the latest released `0.x` minor version only; please upgrade to the newest release (`npm view` / the Releases page) before reporting.

## Reporting a vulnerability

Please do not open a public issue, pull request or discussion for a security problem.

Report it privately with GitHub private vulnerability reporting: open the repository's **Security** tab, choose **Report a vulnerability**,
and describe the problem. Include what is affected (component and version or commit), the steps to reproduce it, and the impact you expect.
Please do not include real credentials or personal data in the report.

You can expect an acknowledgement of the report, an assessment, and a fix or a mitigation plan. Once a fix is released the report may be
published as a security advisory, crediting the reporter if they wish.

## Handling secrets

This repository must never contain secrets: API keys, tokens, passwords or private keys. If you find one committed, report it as above so that it can be revoked and removed.
