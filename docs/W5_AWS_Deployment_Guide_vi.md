# Hướng Dẫn Triển Khai AWS Tuần 5 - Network Fortress

Tài liệu này hướng dẫn chi tiết từng bước để triển khai ứng dụng "Secure File Hub" lên AWS, tuân thủ đúng 5 Must-Haves (MH) của Tuần 5. Đánh dấu `[x]` sau khi bạn hoàn thành mỗi bước.

## Chuẩn Bị Ban Đầu
- [ ] Code ứng dụng đã sẵn sàng (frontend `index.html`, backend `app.js`, `lambda.js`).
- [ ] Khởi tạo thư mục `docs/W5_evidence.md` dựa theo template đã cung cấp để bắt đầu lưu screenshot.

---

## MH1: Multi-VPC Connectivity & Flow Logs
Mục tiêu: Đảm bảo mạng có thể quan sát được và các VPC có thể giao tiếp (nếu có).

- [ ] **Lựa chọn Topology**: Quyết định sử dụng VPC Peering, Transit Gateway hoặc Single VPC. Giả sử bạn sử dụng 1 VPC chuẩn với các private/public subnets (Cần viết Justification cho lựa chọn này nếu chọn Single-VPC).
- [ ] **Tạo VPC Flow Logs**: 
  - Vào dịch vụ **VPC** > Chọn VPC của bạn.
  - Chuyển sang tab **Flow Logs** > Create flow log.
  - Chọn Filter: *All*, Destination: *Send to CloudWatch Logs* (tạo Log group mới tên `VPC-Flow-Logs`).
  - *Evidence*: Chụp ảnh một dòng log chứa `ACCEPT` hoặc `REJECT`.

---

## MH2: Network Firewall Hardening
Mục tiêu: Ép buộc bảo mật tại biên VPC. Do Lambda ở private subnet cần ra internet hoặc gọi AWS services, nếu qua NAT Gateway thì **bắt buộc** dùng Network Firewall. (Hoặc bạn có thể dùng SG+NACL nếu không có NAT Gateway và chỉ dùng VPC Endpoints).

*Hướng dẫn theo Path A: Network Firewall (nếu bạn có NAT Gateway)*
- [ ] Tạo subnet riêng cho Firewall (Firewall subnet) trong VPC.
- [ ] Vào **VPC** > **AWS Network Firewall** > Create firewall.
- [ ] Tạo Firewall Policy kèm theo **Stateful Rule Group** (VD: Domain allowlist cho `.amazonaws.com`).
- [ ] Bật **Alert Logs** đẩy về CloudWatch.
- [ ] Cập nhật **Route Table** của Private Subnet: Trỏ đường ra `0.0.0.0/0` qua **Firewall Endpoint** thay vì thẳng ra NAT Gateway.
- [ ] Cập nhật Route Table của Firewall Subnet: Trỏ ra NAT Gateway hoặc Internet Gateway.
- [ ] *Evidence*: Chụp log một request bị chặn trong Alert Logs.

---

## MH3: File Storage Layer + Backup Plan
Mục tiêu: Dùng EFS lưu file dùng chung và test khôi phục.

### Cấu hình EFS
- [ ] Vào **EFS** > Create file system (chọn đúng VPC của bạn).
- [ ] Ở phần Network, tạo Mount Targets ở Private Subnets. 
- [ ] Cấu hình **Security Group** của Mount Target: Chỉ cho phép Inbound cổng `2049` (NFS) từ Security Group của app/Lambda.
- [ ] *Evidence*: Chụp log/màn hình chứng minh Lambda hoặc EC2 đã ghi file lên thư mục `/mnt/efs/uploads`.

### Cấu hình AWS Backup
- [ ] Vào **AWS Backup** > Create Backup plan.
- [ ] Cấu hình schedule (VD: Daily), retention (VD: 7 days) và chỉ định Backup Vault.
- [ ] Assign resources: Chọn EFS vừa tạo và DynamoDB table (`FileMetadata`).
- [ ] **Thực hiện Restore Test**:
  - Chọn một Recovery point đã báo *Completed* của EFS.
  - Chọn *Restore* thành một File System mới.
  - Đợi báo *Completed*.
  - *Evidence*: Chụp màn hình job restore *Completed* và xác nhận data trong đó vẫn còn.

---

## MH4: API Gateway + Auth + Throttling
Mục tiêu: Xây API tử tế thay vì gọi Lambda trực tiếp.

- [ ] Deploy code Backend lên AWS Lambda (qua Serverless Framework, SAM, hoặc zip up lên Console).
- [ ] Gắn EFS vào Lambda: Vào Lambda > Configuration > File systems > Mount EFS tại path `/mnt/efs/uploads`.
- [ ] Cấp quyền IAM cho Lambda Role: Gọi DynamoDB (`AmazonDynamoDBFullAccess` hoặc custom) và truy cập VPC/EFS (`AWSLambdaVPCAccessExecutionRole`, quyền EFS mount).
- [ ] Vào **API Gateway** > Create **REST API** (hoặc HTTP API).
- [ ] Tạo Resource `/api/{proxy+}` với method `ANY` > Tích hợp **Lambda Proxy Integration** với Lambda function vừa deploy.
- [ ] **Authentication**:
  - Tại Method Request, đổi *API Key Required* thành `true`.
- [ ] **Throttling & Usage Plan**:
  - Tạo *API Key* mới trong API Gateway.
  - Tạo *Usage Plan*, đặt Rate (VD: 10 req/s), Burst (VD: 20).
  - Gắn API Stage và API Key vào Usage Plan này.
- [ ] Deploy API ra một Stage (VD: `prod`). Lấy URL endpoint.
- [ ] **Cập nhật Frontend**: Mở file `frontend/index.html`, cập nhật biến `API_GATEWAY_URL` và `API_KEY` bằng thông tin thật.
- [ ] *Evidence*: Chạy lệnh curl (hoặc dùng Postman) chứng minh: gọi không có key trả về 403, có key trả về 200. Chụp 2 ảnh này lại.

---

## MH5: Serverless Scaling Pattern
Mục tiêu: Quản lý tải của Lambda đúng cách.

- [ ] Lựa chọn pattern **Reserved Concurrency**:
  - Vào **Lambda** > Configuration > Concurrency.
  - Chọn *Reserve concurrency* và thiết lập mức trần (Ví dụ: 5 hoặc 10).
- [ ] Dùng công cụ test tải (VD: Artillery, Hey, hoặc spam F5 trên web) gửi số lượng request lớn vượt qua mức 5-10 đó.
- [ ] Vào **CloudWatch Metrics** > Xem chỉ số của Lambda, tìm metric `Throttles`.
- [ ] *Evidence*: Chụp biểu đồ CloudWatch hiện thị lượng invocation bị Throttled, chứng minh Reserved Concurrency đã hoạt động để bảo vệ hệ thống khỏi bão request.

---

## Hoàn thành
- [ ] Sau khi làm xong, đưa trang `index.html` của bạn lên S3 (Static Website Hosting) hoặc CloudFront để demo.
- [ ] Hoàn thiện file `docs/W5_evidence.md` với đầy đủ screenshot và chuẩn bị thuyết trình!
