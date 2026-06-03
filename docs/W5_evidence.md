# W5 Evidence Pack - The Network Fortress

| Thông tin | Chi tiết |
|-----------|---------|
| **Nhóm** | XBrain_Group10 |
| **Tên thành viên** | Nguyễn Thị Mến |
| **Tuần** | W5 - The Network Fortress (11–15 tháng 5, 2026) |
| **Deadline** | Thứ Năm 04-06-2026 |
| **Link Repository** | https://github.com/nguyenmen04/W5.git |
| **Evidence Pack tuần trước** | https://github.com/huyjaky/w4aws |
| **Ngày tạo** | 01-06-2026 |

---

## 1. Application Recap & Reflection

### Kiến trúc hiện tại
**Mô tả ngắn ứng dụng:**
- **Tên ứng dụng:** Secure File Hub
- **Stack công nghệ:** HTML/JS (Frontend), Node.js (Lambda Backend), DynamoDB, API Gateway, Amazon EFS
- **Lớp lưu trữ file:** Amazon EFS (W5-Secure-File-Hub)
- **Cơ sở dữ liệu:** Amazon DynamoDB (FileMetadata)
- **Backup được quản lý bởi:** AWS Backup (Fallback plan do giới hạn Lab account)

### Ứng dụng chạy end-to-end (Live Demo)
**Action đại diện chứng minh app hoạt động:**
<img width="1458" height="776" alt="image" src="https://github.com/user-attachments/assets/dfb8bb83-037a-4135-b62a-8e15a4bce22c" />


---

## 2. MH1 — Multi-VPC Connectivity & Observability
**Lựa chọn Topology:** Single-VPC (Sử dụng Default VPC của AWS)
**Lý do (Rationale):** Ứng dụng "Secure File Hub" ở giai đoạn hiện tại có quy mô nhỏ, tập trung vào việc quản lý file và xác thực cơ bản, chưa có nhu cầu phân tách mạng phức tạp giữa các phòng ban. Việc dùng chung 1 VPC với Multi-AZ (3 Subnets) là đủ để đảm bảo tính sẵn sàng cao (High Availability) và tối ưu chi phí hạ tầng.

### Tổng quan cấu hình mạng
| Thông tin | Chi tiết |
|-----------|---------|
| **VPC Model** | Single VPC Architecture (Default VPC) |
| **Subnet Design** | 3 Public Subnets (Trải dài trên 3 Availability Zones) |
| **Internet Access** | Thông qua Internet Gateway mặc định |
| **Flow Logs** | Enabled (Ghi log vào CloudWatch) |

**Bằng chứng Flow Logs:**

<img width="1362" height="153" alt="image" src="https://github.com/user-attachments/assets/7565a05c-5fd6-43ad-9898-44e27cc961f5" />

---

## 3. MH2 — Network Firewall Hardening (Ép buộc tại biên)
**Path đã chọn:** Hardened SG + NACL (Sử dụng VPC Endpoint)
**Lý do (Rationale):** Vì hệ thống sử dụng VPC mặc định và không có NAT Gateway, toàn bộ giao tiếp giữa Lambda và DynamoDB được cô lập hoàn toàn khỏi Internet thông qua Gateway VPC Endpoint. Do đó, áp dụng NACL để chặn các port không cần thiết ở biên mạng là phương pháp tối ưu nhất.

### Traffic Inspection & Block Rule (NACL Inbound)
| Rule Number | Type | Protocol | Port Range | Source | Allow/Deny |
|-------------|------|----------|------------|--------|------------|
| 99 | SSH (22) | TCP | 22 | 0.0.0.0/0 | DENY |
| 100 | All traffic | All | All | 0.0.0.0/0 | ALLOW |

**Bằng chứng Block Request:**

<img width="1599" height="667" alt="image" src="https://github.com/user-attachments/assets/b8cd0d35-0797-424c-89b8-77496bac13d6" />

---

## 4. MH3 — File Storage Layer + Backup Plan

### Cấu hình Amazon EFS
| Thông tin | Chi tiết |
|-----------|---------|
| **Tên File System** | W5-Secure-File-Hub |
| **Access Point** | `/app` (POSIX User: 1000, Permissions: 0777) |
| **Mount Target SG** | `EFS-SG` (Cho phép cổng NFS 2049) |
| **Local Mount Path** | `/mnt/efs` (Gắn vào Lambda) |

### Write & Read Test
**Bằng chứng EFS/FSx Mount & Ghi/Đọc:**

<img width="1543" height="440" alt="image" src="https://github.com/user-attachments/assets/ca0ce748-a7ec-4b81-9f6d-42eb6f641253" />

### Restore Test (Fallback Plan)
**Bằng chứng Backup Plan & Khôi phục:**
*Mặc dù em đã nắm rõ quy trình tạo Backup Plan và Test Restore, tuy nhiên do tài khoản thực hành (Lab/Vocareum) bị giới hạn quyền IAM đối với dịch vụ AWS Backup, em không thể lưu cấu hình và chạy test qua Console. Nhóm lựa chọn fallback plan là ghi chú minh chứng giới hạn của Lab account.*

---

## 5. MH4 — API Gateway trước Lambda

### Cấu hình API Gateway
| Thông tin | Chi tiết |
|-----------|---------|
| **API Type** | REST API |
| **Stage** | prod |
| **Integration Type** | Lambda Proxy Integration (Kết nối với hàm `W5-Backend`) |
| **Authentication** | Bắt buộc dùng API Key (Header `x-api-key`) |
| **CORS** | Enabled (Cho phép Frontend gọi chéo miền) |

### Test Authentication
**Bằng chứng Auth (200 & 403):**

<img width="1263" height="326" alt="image" src="https://github.com/user-attachments/assets/3a649309-8a61-4502-b345-c631f1f69930" />

*Note: API Gateway chặn request không có `x-api-key` header.*

<img width="1919" height="395" alt="image" src="https://github.com/user-attachments/assets/265f91f1-48cc-4468-b2f6-1987141c8c95" />

---

## 6. MH5 — Serverless Scaling Pattern
**Pattern đã chọn:** Reserved Concurrency

### Cấu hình Lambda Scaling
| Thông tin | Chi tiết |
|-----------|---------|
| **Function Name** | W5-Backend |
| **Scaling Pattern** | Reserved Concurrency |
| **Target Concurrency** | 5 (Bị chặn do giới hạn Quota của tài khoản Lab) |

### Bằng chứng Throttling/Scaling:

<img width="704" height="428" alt="image" src="https://github.com/user-attachments/assets/0c0bab22-1c38-4fed-8526-4975cbb8df59" />

---

## 7. Application Carry-Forward Verification
**Bằng chứng ứng dụng chạy thực tế End-to-End:**

<img width="1104" height="511" alt="image" src="https://github.com/user-attachments/assets/86a0cb72-a7d8-4285-877c-ec8f80eb3878" />

---

## 8. Negative Security Tests
**Bằng chứng cấu hình bảo mật được ép buộc:**

<img width="1647" height="262" alt="image" src="https://github.com/user-attachments/assets/eaeed0fc-e73d-43a6-b2e2-00cf8c244066" />

