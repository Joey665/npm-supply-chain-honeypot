---

# Simulation Report: MicrosoftSystem64 Behavior & Detection Analysis

## Summary & Context

On **June 6, 2026**, a behavioral simulation was executed on an **Azure B1s VM (Ubuntu 22.04)** equipped with **Falco (modern-bpf)** for runtime monitoring. The objective was to replicate the technical attack chain of the *hexalpha10/toskypi* npm Remote Access Trojan (RAT) campaign, which was disclosed by Microsoft Threat Intelligence on June 3, 2026.

The simulation yielded critical insights into how modern supply chain attacks exploit trusted AI infrastructure for Command and Control (C2) communication, and how standard Linux boundary controls affect malware execution in developer environments.

---

## Technical Findings & Behavioral Analysis

### 1. Command & Control (C2) Beaconing via Hugging Face

* **Execution Status:** **SUCCEEDED**
* **Technical Target:** `huggingface.co/api`
* **Analysis & Narrative:** The simulated payload successfully initiated and established outbound communication with Hugging Face. This outcome exposes a severe blind spot in modern network security: traditional egress allowlists and firewall rules frequently permit traffic to legitimate AI platforms. Because Hugging Face is an industry-standard repository, these outbound connections seamlessly blend into normal machine learning and developer workflows. In an enterprise environment, this traffic rarely triggers network-level anomalies, transforming a trusted AI infrastructure provider into a highly attractive, stealthy exfiltration channel.

### 2. Credential Access & Local Privilege Boundaries

* **Execution Status:** **BLOCKED**
* **Technical Target:** `/etc/shadow` (Result: `EACCES` / Permission Denied)
* **Analysis & Narrative:** During the simulation, automated attempts to read root-level privileged files were successfully thwarted by native Linux file permissions. However, this failure highlights a critical distinction between a sandboxed test environment and a real-world asset. On a standard developer workstation, an `npm install` command runs under the context of the local user. While the malware cannot read `/etc/shadow`, a real-world campaign targets user-accessible assets. The malware would have unhindered access to sensitive developer data, specifically targeting:
* **SSH keys** (`~/.ssh/id_rsa`)
* **Active browser sessions & credential stores**
* **Cloud provider secrets** (`~/.aws/credentials`)
* **Package manager tokens** (`~/.npmrc`)

Because these high-value assets inherit the current user's permissions, they are entirely vulnerable to exfiltration without requiring administrative elevation.

### 3. System Persistence Mechanisms

* **Execution Status:** **BLOCKED**
* **Technical Target:** `/etc/systemd/system/MicrosoftSystem64.service` (Result: `EACCES` / Permission Denied)
* **Analysis & Narrative:** The payload’s attempt to establish system-wide persistence failed because the simulation environment lacked root-level privileges. While this underscores the baseline security value of operating within non-administrative bounds, it exposes how malware adapts to developer spaces. In the live *hexalpha10/toskypi* campaign, the malware bypasses root restrictions by aiming for user-level persistence. Instead of modifying system binaries, it injects malicious hooks into user-space configuration files like `~/.bashrc` (or the `HKCU` registry hive on Windows systems), ensuring survival across reboots without ever triggering an elevation prompt.

---

## Key Security Takeaway & Detection Strategy

The defining takeaway from this simulation is that **network-level controls are insufficient** to stop supply chain attacks leveraging AI infrastructure. Because the C2 channel relies on `huggingface.co/api`, it circumvents perimeter defenses by masquerading as legitimate ML activity.

To mitigate this threat, defense strategies must shift from the network edge to runtime behavior monitoring. Organizations must configure runtime detection engines (like Falco) to flag unexpected API calls to Hugging Face or similar repositories when initiated by non-ML workloads, unexpected binaries, or unauthorized user processes.