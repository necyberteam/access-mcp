# XDMoD Metrics Reference Guide

Comprehensive reference for all realms, dimensions, and statistics available on the ACCESS XDMoD instance (xdmod.access-ci.org). Last updated: 2026-02-22.

Statistics were discovered from the live API. Dimensions come from the `get_menus` endpoint.

## Realms

XDMoD organizes metrics into **9 realms**:

| Realm | Description | Statistics |
|-------|-------------|-----------|
| Accounts | ACCESS user account tracking | 2 |
| Allocations | Allocation and project tracking | 11 |
| Cloud | Cloud/virtualized compute | 11 |
| Gateways | Science gateway jobs | 33 |
| Jobs | Job accounting and resource usage | 35 |
| Requests | Allocation request/proposal tracking | 2 |
| ResourceSpecifications | Resource hardware specs and capacity | 18 |
| Storage | File system and storage usage | 6 |
| SUPREMM | Detailed job performance analytics | 50 |

---

### Accounts
ACCESS user account tracking — accounts associated with allocations and job activity.

**Dimensions:** none, resource, resource_type

**Statistics:**
- `unique_account_count` — Number of Accounts: Created
- `unique_account_with_jobs_count` — Number of Accounts: Created w/Jobs

---

### Allocations
Allocation and project tracking — active allocations, PIs, and resource usage in SUs/ACEs.

**Dimensions:** none, allocation, allocation_type, board_type, fieldofscience, nsfdirectorate, pi, parentscience, resource, resource_type

**Statistics:**
- `active_allocation_count` — Number of Projects: Active
- `active_pi_count` — Number of PIs: Active
- `active_resallocation_count` — Number of Allocations: Active
- `allocated_nu` — NUs: Allocated
- `allocated_raw_su` — CPU Core Hours: Allocated
- `allocated_su` — XD SUs: Allocated
- `allocated_ace` — ACCESS Credit Equivalents: Allocated (SU)
- `rate_of_usage` — Allocation Usage Rate (XD SU/Hour)
- `rate_of_usage_ace` — Allocation Usage Rate ACEs (SU/Hour)
- `used_su` — XD SUs: Used
- `used_ace` — ACCESS Credit Equivalents: Used (SU)

---

### Cloud
Cloud and virtualized compute environment metrics.

**Dimensions:** none, configuration, domain, instance_type, person, pi, project, provider, resource, resource_type, submission_venue, instance_state, institution, institution_country, institution_state, nsfdirectorate, parentscience, fieldofscience, pi_institution, pi_institution_country, pi_institution_state, vm_size, vm_size_cpu, vm_size_memory

**Statistics:**
- `cloud_num_sessions_ended` — Number of Sessions Ended
- `cloud_num_sessions_started` — Number of Sessions Started
- `cloud_num_sessions_running` — Number of Sessions Active
- `cloud_wall_time` — Wall Hours: Total
- `cloud_core_time` — CPU Hours: Total
- `cloud_avg_wallduration_hours` — Wall Hours: Per Session
- `cloud_avg_cores_reserved` — Average Cores Reserved Weighted By Wall Hours
- `cloud_avg_memory_reserved` — Average Memory Reserved Weighted By Wall Hours (Bytes)
- `cloud_avg_rv_storage_reserved` — Average Root Volume Storage Reserved Weighted By Wall Hours (Bytes)
- `cloud_core_utilization` — Core Hour Utilization (%)
- `gateway_session_count` — Number of Sessions Ended via Gateway

---

### Gateways
Science gateway job metrics — jobs submitted through ACCESS gateways.

**Dimensions:** none, allocation, fieldofscience, gateway, gateway_user, grant_type, jobsize, jobwaittime, jobwalltime, nsfdirectorate, nodecount, pi, pi_institution, pi_institution_country, pi_institution_state, parentscience, queue, resource, resource_type, provider, person, institution, institution_country, institution_state

**Statistics:**
- `job_count` — Number of Jobs Ended
- `running_job_count` — Number of Jobs Running
- `started_job_count` — Number of Jobs Started
- `submitted_job_count` — Number of Jobs Submitted
- `total_cpu_hours` — CPU Hours: Total
- `total_node_hours` — Node Hours: Total
- `total_wallduration_hours` — Wall Hours: Total
- `total_waitduration_hours` — Wait Hours: Total
- `avg_cpu_hours` — CPU Hours: Per Job
- `avg_node_hours` — Node Hours: Per Job
- `avg_wallduration_hours` — Wall Hours: Per Job
- `avg_waitduration_hours` — Wait Hours: Per Job
- `avg_processors` — Job Size: Per Job (Core Count)
- `max_processors` — Job Size: Max (Core Count)
- `min_processors` — Job Size: Min (Core Count)
- `normalized_avg_processors` — Job Size: Normalized (% of Total Cores)
- `avg_job_size_weighted_by_cpu_hours` — Job Size: Weighted By CPU Hours (Core Count)
- `avg_job_size_weighted_by_xd_su` — Job Size: Weighted By XD SUs (Core Count)
- `avg_job_size_weighted_by_ace` — Job Size: Weighted By ACEs (Core Count)
- `total_su` — XD SUs Charged: Total
- `avg_su` — XD SUs Charged: Per Job
- `total_nu` — NUs Charged: Total
- `avg_nu` — NUs Charged: Per Job
- `total_ace` — ACCESS Credit Equivalents Charged: Total (SU)
- `avg_ace` — ACCESS Credit Equivalents Charged: Per Job (SU)
- `rate_of_usage` — Allocation Usage Rate (XD SU/Hour)
- `rate_of_usage_ace` — Allocation Usage Rate ACEs (SU/Hour)
- `expansion_factor` — User Expansion Factor
- `utilization` — ACCESS CPU Utilization (%)
- `active_resource_count` — Number of Resources: Active
- `active_institution_count` — Number of Institutions: Active
- `active_gateway_count` — Number of Gateways: Active
- `active_gwuser_count` — Number of Gateway Users: Active

---

### Jobs
Job accounting and resource usage metrics from job schedulers.

**Dimensions:** none, allocation, fieldofscience, grant_type, jobsize, jobwaittime, jobwalltime, nsfdirectorate, nodecount, pi, pi_institution, pi_institution_country, pi_institution_state, parentscience, queue, resource, resource_type, provider, person, institution, institution_country, institution_state, username, qos, application

**Statistics:**
- `job_count` — Number of Jobs Ended
- `running_job_count` — Number of Jobs Running
- `started_job_count` — Number of Jobs Started
- `submitted_job_count` — Number of Jobs Submitted
- `total_cpu_hours` — CPU Hours: Total
- `total_node_hours` — Node Hours: Total
- `total_wallduration_hours` — Wall Hours: Total
- `total_waitduration_hours` — Wait Hours: Total
- `avg_cpu_hours` — CPU Hours: Per Job
- `avg_node_hours` — Node Hours: Per Job
- `avg_wallduration_hours` — Wall Hours: Per Job
- `avg_waitduration_hours` — Wait Hours: Per Job
- `avg_processors` — Job Size: Per Job (Core Count)
- `max_processors` — Job Size: Max (Core Count)
- `min_processors` — Job Size: Min (Core Count)
- `normalized_avg_processors` — Job Size: Normalized (% of Total Cores)
- `avg_job_size_weighted_by_cpu_hours` — Job Size: Weighted By CPU Hours (Core Count)
- `avg_job_size_weighted_by_xd_su` — Job Size: Weighted By XD SUs (Core Count)
- `avg_job_size_weighted_by_ace` — Job Size: Weighted By ACEs (Core Count)
- `total_su` — XD SUs Charged: Total
- `avg_su` — XD SUs Charged: Per Job
- `total_nu` — NUs Charged: Total
- `avg_nu` — NUs Charged: Per Job
- `total_ace` — ACCESS Credit Equivalents Charged: Total (SU)
- `avg_ace` — ACCESS Credit Equivalents Charged: Per Job (SU)
- `rate_of_usage` — Allocation Usage Rate (XD SU/Hour)
- `rate_of_usage_ace` — Allocation Usage Rate ACEs (SU/Hour)
- `expansion_factor` — User Expansion Factor
- `utilization` — ACCESS CPU Utilization (%)
- `gateway_job_count` — Number of Jobs via Gateway
- `active_person_count` — Number of Users: Active
- `active_pi_count` — Number of PIs: Active
- `active_resource_count` — Number of Resources: Active
- `active_allocation_count` — Number of Allocations: Active
- `active_institution_count` — Number of Institutions: Active

---

### Requests
Allocation request/proposal tracking.

**Dimensions:** none, fieldofscience, nsfdirectorate, parentscience

**Statistics:**
- `request_count` — Number of Proposals
- `project_count` — Number of Projects

---

### ResourceSpecifications
Resource hardware specifications — CPU/GPU counts, node hours, and capacity metrics.

**Dimensions:** none, resource, resource_institution_country, resource_institution_state, resource_type

**Statistics:**
- `total_cpu_core_hours` — CPU Hours: Total
- `allocated_cpu_core_hours` — CPU Hours: Allocated
- `total_gpu_hours` — GPU Hours: Total
- `allocated_gpu_hours` — GPU Hours: Allocated
- `total_gpu_node_hours` — GPU Node Hours: Total
- `allocated_gpu_node_hours` — GPU Node Hours: Allocated
- `total_cpu_node_hours` — CPU Node Hours: Total
- `allocated_cpu_node_hours` — CPU Node Hours: Allocated
- `total_avg_number_of_cpu_cores` — Average Number of CPU Cores: Total
- `allocated_avg_number_of_cpu_cores` — Average Number of CPU Cores: Allocated
- `total_avg_number_of_gpus` — Average Number of GPUs: Total
- `allocated_avg_number_of_gpus` — Average Number of GPUs: Allocated
- `total_avg_number_of_cpu_nodes` — Average Number of CPU Nodes: Total
- `allocated_avg_number_of_cpu_nodes` — Average Number of CPU Nodes: Allocated
- `total_avg_number_of_gpu_nodes` — Average Number of GPU Nodes: Total
- `allocated_avg_number_of_gpu_nodes` — Average Number of GPU Nodes: Allocated
- `ace_total` — ACCESS Credit Equivalents Available: Total (SU)
- `ace_allocated` — ACCESS Credit Equivalents Available: Allocated (SU)

---

### Storage
File system and storage usage metrics.

**Dimensions:** (none returned from API — Storage realm may not appear in all menu queries)

**Statistics:**
- `user_count` — User Count
- `avg_physical_usage` — Physical Usage (Bytes)
- `avg_logical_usage` — Logical Usage (Bytes)
- `avg_file_count` — File Count
- `avg_hard_threshold` — Quota: Hard Threshold (Bytes)
- `avg_soft_threshold` — Quota: Soft Threshold (Bytes)

---

### SUPREMM
Detailed job performance analytics — CPU, GPU, memory, network, and I/O metrics from monitoring.

**Dimensions:** none, resource, person, pi, institution, jobsize, queue, fieldofscience, nsfdirectorate, parentscience, application, cpi, cpu, cpucv, cpuuser, datasource, exit_status, gpu_count, granted_pe, ibrxbyterate, jobwalltime, max_mem, mem_used, netdir_home_write, netdir_scratch_write, netdir_work_write, netdrv_lustre_rx, nodecount, pi_institution, pi_institution_country, pi_institution_state, provider, resource_type, shared, username, institution_country, institution_state

**Statistics:**
- `job_count` — Number of Jobs Ended
- `short_job_count` — Number of Short Jobs Ended
- `running_job_count` — Number of Jobs Running
- `started_job_count` — Number of Jobs Started
- `submitted_job_count` — Number of Jobs Submitted
- `wall_time` — CPU Hours: Total
- `wall_time_per_job` — Wall Hours: Per Job
- `wait_time` — Wait Hours: Total
- `wait_time_per_job` — Wait Hours: Per Job
- `requested_wall_time` — Wall Hours: Requested: Total
- `requested_wall_time_per_job` — Wall Hours: Requested: Per Job
- `wall_time_accuracy` — Wall Time Accuracy (%)
- `cpu_time_user` — CPU Hours: User: Total
- `cpu_time_system` — CPU Hours: System: Total
- `cpu_time_idle` — CPU Hours: Idle: Total
- `avg_percent_cpu_user` — Avg CPU %: User: weighted by core-hour
- `avg_percent_cpu_system` — Avg CPU %: System: weighted by core-hour
- `avg_percent_cpu_idle` — Avg CPU %: Idle: weighted by core-hour
- `avg_cpuusercv_per_core` — Avg: CPU User CV: weighted by core-hour
- `avg_cpuuserimb_per_core` — Avg: CPU User Imbalance: weighted by core-hour (%)
- `gpu_time` — GPU Hours: Total
- `avg_percent_gpu_usage` — Avg GPU usage: weighted by GPU hour (GPU %)
- `avg_flops_per_core` — Avg: FLOPS: Per Core weighted by core-hour (ops/s)
- `avg_cpiref_per_core` — Avg: CPI: Per Core weighted by core-hour
- `avg_cpldref_per_core` — Avg: CPLD: Per Core weighted by core-hour
- `avg_memory_per_core` — Avg: Memory: Per Core weighted by core-hour (bytes)
- `avg_total_memory_per_core` — Avg: Total Memory: Per Core weighted by core-hour (bytes)
- `avg_max_memory_per_core` — Avg: Max Memory: weighted by core-hour (%)
- `avg_mem_bw_per_core` — Avg: Memory Bandwidth: Per Core weighted by core-hour (bytes/s)
- `avg_ib_rx_bytes` — Avg: InfiniBand rate: Per Node weighted by node-hour (bytes/s)
- `avg_homogeneity` — Avg: Homogeneity: weighted by node-hour (%)
- `avg_net_eth0_rx` — Avg: eth0 receive rate: Per Node weighted by node-hour (bytes/s)
- `avg_net_eth0_tx` — Avg: eth0 transmit rate: Per Node weighted by node-hour (bytes/s)
- `avg_net_ib0_rx` — Avg: ib0 receive rate: Per Node weighted by node-hour (bytes/s)
- `avg_net_ib0_tx` — Avg: ib0 transmit rate: Per Node weighted by node-hour (bytes/s)
- `avg_netdrv_lustre_rx` — Avg: lustre receive rate: Per Node weighted by node-hour (bytes/s)
- `avg_netdrv_lustre_tx` — Avg: lustre transmit rate: Per Node weighted by node-hour (bytes/s)
- `avg_block_sda_rd_bytes` — Avg: block sda read rate: Per Node weighted by node-hour (bytes/s)
- `avg_block_sda_wr_bytes` — Avg: block sda write rate: Per Node weighted by node-hour (bytes/s)
- `avg_block_sda_rd_ios` — Avg: block sda read ops rate: Per Node weighted by node-hour (ops/s)
- `avg_block_sda_wr_ios` — Avg: block sda write ops rate: Per Node weighted by node-hour (ops/s)
- `avg_netdir_home_write` — Avg: /home write rate: Per Node weighted by node-hour (bytes/s)
- `avg_netdir_scratch_write` — Avg: /scratch write rate: Per Node weighted by node-hour (bytes/s)
- `avg_netdir_work_write` — Avg: /work write rate: Per Node weighted by node-hour (bytes/s)
- `total_su` — XD SUs Charged: Total
- `avg_su` — XD SUs Charged: Per Job
- `total_ace` — ACCESS Credit Equivalents Charged: Total (SU)
- `avg_ace` — ACCESS Credit Equivalents Charged: Per Job (SU)
- `active_pi_count` — Number of PIs: Active
- `active_app_count` — Number of Applications: Active

Note: SUPREMM also reports several `avg_net_mic*` statistics for MIC (Xeon Phi) network interfaces, which are available on some older resources.

---

## Common Usage Patterns

### System-Wide CPU Usage
```json
{ "realm": "Jobs", "group_by": "none", "statistic": "total_cpu_hours" }
```

### GPU Usage by Resource
```json
{ "realm": "SUPREMM", "group_by": "resource", "statistic": "gpu_time" }
```

### Resource Hardware Capacity
```json
{ "realm": "ResourceSpecifications", "group_by": "resource", "statistic": "total_avg_number_of_gpus" }
```

### Allocation Usage
```json
{ "realm": "Allocations", "group_by": "none", "statistic": "used_ace" }
```

### Gateway Activity
```json
{ "realm": "Gateways", "group_by": "gateway", "statistic": "job_count" }
```

## Discovery Method

Statistics can be discovered from the live API by requesting `get_data` from `user_interface.php` with `public_user=true`, no `statistic` parameter, and `format=jsonstore`. The response includes `metaData.fields` listing all available statistics for the realm.
