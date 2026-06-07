# npm Supply Chain Honeypot & Detection Lab

Simulating modern npm malware behavior and evaluating runtime detection with Falco on Microsoft Azure.

Recent npm supply chain campaigns such as MicrosoftSystem64,
Contagious Interview, BigSquatRat, and the Red Hat Miasma
incident have demonstrated how attackers can abuse trusted
developer ecosystems to distribute malware.

Many of these campaigns rely on:

- Malicious npm packages
- Postinstall hooks
- Credential theft
- Persistence mechanisms
- Trusted cloud services for exfiltration

This project recreates those behaviors in a controlled Azure
environment and evaluates whether Falco can detect them at runtime.
