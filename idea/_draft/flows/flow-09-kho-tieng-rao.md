### FLOW-09 Chuẩn bị kho tiếng rao (BIZ-09)
- **Actor:** ACT-07 Đội phát triển · **Trigger:** Trước khi phát hành; khi muốn đổi bộ tiếng · **Kết quả:** Kho tiếng rao đầy đủ được nạp vào sản phẩm

```mermaid
flowchart TD
  subgraph D["ACT-07 Đội phát triển (ngoài ứng dụng)"]
    S1["Soạn kịch bản câu rao:<br/>90 số, câu nối, chúc mừng, kinh hụt"]
    S2["Chuẩn bị audio mẫu giọng rao"]
    S3["Dùng AI chuyển thành các đoạn audio ngắn"]
    S4["Nghe duyệt chất lượng"]
    S5{"Đủ mỗi số ≥ 1 câu<br/>+ câu nối, chúc mừng, kinh hụt?<br/>BR-26"}
    S6["Nạp kho tiếng rao vào sản phẩm"]
    X1(["Sẵn sàng phát (SUP-02)"])
  end
  S1 --> S2 --> S3 --> S4 --> S5
  S5 -- Chưa --> S3
  S5 -- Đủ --> S6 --> X1
```

- **Happy path:**
  1. Soạn kịch bản: câu rao cho từng số 1–90 (có thể nhiều câu/số), câu nối, câu chúc mừng người thắng, câu kinh hụt.
  2. Chuẩn bị audio mẫu giọng rao lô tô.
  3. Dùng AI tạo các đoạn audio ngắn theo kịch bản.
  4. Nghe duyệt chất lượng.
  5. Kiểm tra đủ theo BR-26.
  6. Nạp vào sản phẩm; từ đó FLOW-07/FLOW-08 phát được (SUP-02).
- **Alternative paths:**
  - A1. Đổi bộ tiếng sau phát hành: lặp lại 1–6; các phòng đang chơi dùng bộ mới từ số kế tiếp.
- **Exceptions:**
  - E1. Thiếu câu cho vài số nhưng vẫn phát hành: các số đó chỉ hiển thị, không phát tiếng (Q-029).
- **Supporting kích hoạt:** SUP-02 (tiêu thụ kho).
- **Business rules áp dụng:** BR-26 bước 5.
