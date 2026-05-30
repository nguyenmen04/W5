# W5 Evidence Pack - The Network Fortress

| Thông tin | Chi tiết |
|-----------|---------|
| **Nhóm** | XBrain_Group10 |
| **Tên thành viên** | Nguyễn Thị Mến |
| **Tuần** | W5 - The Network Fortress (11–15 tháng 5, 2026) |
| **Deadline** | Thứ Năm 04-06-2026 |
| **Link Repository** | https://github.com/hailv1209/XBrain_Group10.git |
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
> *Screenshot Giao diện web UI Secure File Hub tải lên file thành công*
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
> *Screenshot dòng log VPC Flow Logs (hiển thị ACCEPT hoặc REJECT)*
> 💡 **Hướng dẫn lấy ảnh:** 1. Vào dịch vụ **VPC** > Chọn VPC của bạn. 2. Chuyển sang tab **Flow logs**, bấm vào tên cái *Destination* (CloudWatch Logs) màu xanh. 3. Trong CloudWatch, bấm vào cái *Log stream* đầu tiên. 4. Chụp màn hình các dòng log hiển thị chữ ACCEPT hoặc REJECT.
![Flow Logs](đường-dẫn-ảnh.jpg)
*Note: VPC Flow Logs đã được kích hoạt, ghi lại traffic vào CloudWatch.*

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
> *Screenshot màn hình Inbound Rules của NACL hiển thị Rule số 99 chặn port 22 (SSH)*
> 💡 **Hướng dẫn lấy ảnh:** 1. Vào dịch vụ **VPC** > menu trái chọn **Network ACLs**. 2. Chọn NACL của VPC hiện tại. 3. Chọn tab **Inbound rules**. 4. Chụp toàn bộ màn hình hiển thị Rule số 99 chặn port 22 (Type: SSH, Source: 0.0.0.0/0, Allow/Deny: Deny).
![NACL Block](đường-dẫn-ảnh.jpg)
*Note: Hệ thống đã thiết lập Explicit Deny Rule chặn port 22 (SSH) từ 0.0.0.0/0 tại tầng NACL.*

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
> *Screenshot thư mục /mnt/efs/uploads có chứa file được upload từ frontend (hoặc màn hình cấu hình EFS Mount trong Lambda)*
> 💡 **Hướng dẫn lấy ảnh:** 1. Vào dịch vụ **Lambda** > Chọn hàm `W5-Backend`. 2. Chuyển sang tab **Configuration** > Chọn menu **File system** ở bên trái. 3. Chụp màn hình thể hiện ổ đĩa EFS đang được gắn với Local mount path là `/mnt/efs`.
![EFS Mount](đường-dẫn-ảnh.jpg)
*Note: Lambda đã mount thành công EFS và lưu file upload vào storage dùng chung.*

### Restore Test (Fallback Plan)
**Bằng chứng Backup Plan & Khôi phục:**
> *Screenshot báo lỗi Access Denied đỏ lòm khi cố gắng tạo AWS Backup Plan*
> 💡 **Hướng dẫn lấy ảnh:** 1. Vào dịch vụ **AWS Backup** > **Backup plans** > **Create backup plan** > Build a new plan. 2. Cuộn xuống dưới cùng bấm nút Create. 3. Màn hình sẽ văng ra dải lỗi màu đỏ "Access denied...". 4. Chụp dải lỗi đỏ đó để chứng minh giới hạn của tài khoản.
![Backup Plan Error](đường-dẫn-ảnh.jpg)
*Note: Mặc dù nhóm đã nắm rõ quy trình tạo Backup Plan và Test Restore, tuy nhiên do tài khoản thực hành (Lab/Vocareum) bị giới hạn quyền IAM đối với dịch vụ AWS Backup, nhóm không thể lưu cấu hình và chạy test qua Console. Nhóm lựa chọn fallback plan là ghi chú minh chứng giới hạn của Lab account.*

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
> *Screenshot lệnh test cURL báo lỗi 403 khi thiếu API Key*
> 💡 **Hướng dẫn lấy ảnh 403:** Mở PowerShell trên máy tính, chạy lệnh: `curl -i https://ztd80lx47e.execute-api.ap-southeast-1.amazonaws.com/prod/api/files` rồi chụp ảnh kết quả trả về `HTTP/1.1 403 Forbidden`.
![API 403](đường-dẫn-ảnh.jpg)
*Note: API Gateway chặn request không có `x-api-key` header.*

> *Screenshot lệnh test cURL thành công 200 khi có API Key hợp lệ*
> 💡 **Hướng dẫn lấy ảnh 200:** Mở PowerShell, chạy lệnh: `curl -i -H "x-api-key: K6U0InMaVu7jiKPRVxvbH8OIBhdTnJyog2xuYGfc" https://ztd80lx47e.execute-api.ap-southeast-1.amazonaws.com/prod/api/files` rồi chụp ảnh kết quả trả về `HTTP/1.1 200 OK` kèm theo data.
![API 200](đường-dẫn-ảnh.jpg)
*Note: Request mang Auth đầy đủ đã lọt vào Lambda.*

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
> *Screenshot thông báo lỗi "Unreserved account concurrency can't go below 100" trên trang Edit Concurrency của Lambda*
> 💡 **Hướng dẫn lấy ảnh:** 1. Vào dịch vụ **Lambda** > Chọn hàm `W5-Backend`. 2. Tab **Configuration** > **Concurrency** > Bấm **Edit**. 3. Chọn *Reserve concurrency*, gõ số `5`. 4. Chụp ảnh dòng chữ báo lỗi màu đỏ ngay dưới ô nhập số để chứng minh giới hạn quota của account lab.
![Lambda Concurrency Error](đường-dẫn-ảnh.jpg)
*Note: Nhóm lựa chọn phương pháp cấu hình Reserved Concurrency để chống bão request. Tuy nhiên, do giới hạn (Quota) của tài khoản Lab/Vocareum (Account Concurrency tối đa chỉ bằng 5), AWS không cho phép kích hoạt tính năng này vì không thỏa mãn yêu cầu tối thiểu 100 unreserved concurrency.*

---

## 7. Application Carry-Forward Verification
**Bằng chứng ứng dụng chạy thực tế End-to-End:**
> *Screenshot 1: Giao diện người dùng đã kết nối với backend*
> 💡 **Hướng dẫn lấy ảnh 1:** Mở file `frontend/index.html` bằng trình duyệt Chrome/Edge, thử bấm Upload 1 file bất kỳ. Chụp màn hình trang web hiển thị thông báo thành công và có file trong bảng.
![UI Working](đường-dẫn-ảnh.jpg)
> *Screenshot 2: Một item vừa thêm xuất hiện trong DynamoDB table `FileMetadata`*
> 💡 **Hướng dẫn lấy ảnh 2:** Vào dịch vụ **DynamoDB** > **Tables** > Chọn bảng `FileMetadata` > Bấm nút **Explore table items** ở góc trên phải. Chụp màn hình hiển thị danh sách file đang có trong bảng.
![DB Record](đường-dẫn-ảnh.jpg)

---

## 8. Negative Security Tests
**Bằng chứng cấu hình bảo mật được ép buộc:**
> *Screenshot thử gọi port/dịch vụ ngoài luồng nhưng bị Time Out hoặc Permission Denied*
![Negative Test](đường-dẫn-ảnh.jpg)
*Note: Chứng minh cấu hình Security Group ở app tier không mở toang 0.0.0.0/0.*
