
---

# Setup Guide: Cloud Security Supply Chain Lab (Azure & Falco)

This step-by-step implementation guide walks you through provisioning a cloud-native honeypot environment on Microsoft Azure, configuring **Falco** for runtime monitoring, and executing a safe behavioral simulation of the *hexalpha10/toskypi* npm RAT malware campaign.

---

## Phase 1: Environment Provisioning & Infrastructure Setup

### 1. Deploy the Azure Virtual Machine

1. Navigate to [portal.azure.com](https://www.google.com/search?q=https://portal.azure.com).
2. Click **Create a resource** $\rightarrow$ **Virtual Machine**.
3. Configure the instance with the following specifications:
* **OS Image:** `Ubuntu 22.04 LTS`
* **Size:** `Standard_B1s` (Eligible for Azure Free Tier)
* **Inbound Port Rules:** Allow **SSH (Port 22)** from your IP address.


4. Click **Review + create**, then download your private SSH key and deploy.

### 2. Base System Upgrades & Dependency Installation

Once the VM is running, open your terminal, SSH into the instance, and execute the following package management commands:

```bash
# Update package repositories and patch core system packages
sudo apt update && sudo apt upgrade -y

# Install runtime dependencies required for Node.js development
sudo apt install -y nodejs npm curl wget

```

---

## Phase 2: Runtime Security Configuration (Falco)

### 1. Add the Falco Repository and Install the Package

Execute the commands below to import the official signing key and pull the runtime protection package using the modern eBPF driver.

```bash
# Import the official Falco GPG repository key
curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | sudo gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg

# Append the stable repository to your apt sources list
echo "deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] https://download.falco.org/packages/deb stable main" | sudo tee /etc/apt/sources.list.d/falcosecurity.list

# Synchronize indexes and install Falco
sudo apt update && sudo apt install -y falco

```

### 2. Handle Kernel Mismatch Warnings

During installation, a system notification may appear indicating a pending kernel upgrade (`Pending kernel upgrade! Running kernel version: 6.17.0-1011-azure`). Resolve this immediately to bind the modern eBPF probe cleanly to the active kernel:

```bash
# Gracefully reboot the system to apply kernel updates
sudo reboot

```

*Wait 60 seconds, then SSH back into your VM instance.*

### 3. Verify System Service Status

Confirm that the runtime engine has initialized successfully and is running with the modern eBPF probe configuration:

```bash
sudo systemctl status falco-modern-bpf.service

```

Ensure you see a green **`active (running)`** indicator in your console before proceeding.

---

## Phase 3: Honeypot Environment & Target Isolation

To safely replicate the execution of malware without compromising root infrastructure, you must provision an isolated local account and populate target files to fulfill filesystem system calls.

### 1. Establish the Unprivileged User

```bash
# Create an unprivileged user space
sudo useradd -m -s /bin/bash testuser

# Shift execution context out of root space into the test user environment
sudo su - testuser

```

### 2. Generate Simulated Credential Targets

Real supply-chain attacks look for exposed workspace profiles. Populate mock credential locations so read syscalls do not return file-not-found errors (`ENOENT`).

```bash
# Create standard dot-directories for credentials
mkdir -p /home/testuser/.ssh
mkdir -p /home/testuser/.aws

# Populate target configuration files with benign seed data
echo "fake-private-key-content" > /home/testuser/.ssh/id_rsa
echo "[default]aws_access_key_id = AKIAIOSFODNN7EXAMPLE" > /home/testuser/.aws/credentials

# Apply defensive security boundaries to the private key
chmod 600 /home/testuser/.ssh/id_rsa

```

---

## Phase 4: Constructing & Running the Simulation

### 1. Build the Script Infrastructure

Initialize the project workspace structure and deploy the payload engine file (`payload.js`) inside the honeypot subdirectory.

```bash
# Initialize project environment
mkdir -p ~/honeypot && cd ~/honeypot

# Write the simulation engine asset
cat > payload.js << 'EOF'
const os = require('os');
const fs = require('fs');
const https = require('https');

// 1. Replicate host machine asset fingerprinting
const info = {
  hostname: os.hostname(),
  user: os.userInfo().username,
  platform: os.platform(),
  homedir: os.homedir()
};

// 2. Map credential targets for explicit filesystem reads
const targets = [
  os.homedir() + '/.ssh/id_rsa',
  os.homedir() + '/.aws/credentials',
  '/etc/shadow'
];

targets.forEach(t => {
  try { 
    fs.readFileSync(t); 
    info[t] = 'READ'; 
  } catch(e) { 
    info[t] = 'blocked: ' + e.code; 
  }
});

// 3. Replicate low-privilege persistence systemd attempt
try {
  fs.writeFileSync(
    '/etc/systemd/system/MicrosoftSystem64.service',
    '[Service]\nExecStart=/bin/bash'
  );
  info.persistence = 'written';
} catch(e) {
  info.persistence = 'blocked: ' + e.code;
}

// 4. Trigger trusted API outbound C2 beaconing (Hugging Face)
https.get('https://huggingface.co/api/whoami', res => {
  info.c2 = 'connection made to huggingface.co';
  fs.writeFileSync('/tmp/honeypot-output.json', JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
}).on('error', e => {
  info.c2 = 'attempted: ' + e.message;
  fs.writeFileSync('/tmp/honeypot-output.json', JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
});
EOF

```

### 2. Execute the Simulation Engine

Execute the script to trigger behavioral system events.

```bash
node payload.js

```

#### Expected Execution Output:

```json
{
  "hostname": "<your-vm-hostname>",
  "user": "testuser",
  "platform": "linux",
  "homedir": "/home/testuser",
  "/home/testuser/.ssh/id_rsa": "READ",
  "/home/testuser/.aws/credentials": "READ",
  "/etc/shadow": "blocked: EACCES",
  "persistence": "blocked: EACCES",
  "c2": "connection made to huggingface.co"
}

```

---

## Phase 5: Verification & Capture of Artifact Evidence

With the execution engine showing successful reads and outbound network connectivity, extract the corresponding runtime security monitoring artifacts from your platform telemetry logs.

### 1. Extract Telemetry Logs from Syslog

Because default Falco configurations optimize for `syslog` and `stdout` architectures over raw journald pipes, inspect `/var/log/syslog` to isolate the security detection occurrences.

```bash
# Query the system logs for runtime warning events linked to your payload execution
sudo grep -i "sensitive\|id_rsa\|aws\|testuser" /var/log/syslog | tail -20

```

### 2. Document Your Portfolio Evidence

Capture screenshots of the following elements to compile your lab documentation:

| Lab Component Artifact | Verification Value |
| --- | --- |
| **Console Output (`payload.js`)** | Verifies successful outbound network calls (`huggingface.co`) alongside platform permission walls preventing unauthorized write privileges. |
| **Runtime Detection Event Logs** | Displays Falco detecting a Node.js process opening highly sensitive security configuration credentials (`.ssh/id_rsa`). |
| **Output State (`/tmp/honeypot-output.json`)** | Confirms local state tracking data logs representing the baseline data profiling package prior to external egress routing. |