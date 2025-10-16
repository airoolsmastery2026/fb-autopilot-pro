// Vercel Serverless Function: api/post.ts
// Hàm này hoạt động như một proxy backend an toàn tới Facebook Graph API.

// Cấu hình `export const config` được sử dụng để chỉ định cấu hình cho hàm.
// Ở đây, chúng ta đặt thời gian chờ dài hơn vì API của Facebook đôi khi có thể chậm.
export const config = {
  maxDuration: 30,
};

// Đây là hàm xử lý chính cho điểm cuối API.
// Nó nhận một yêu cầu (req) và gửi một phản hồi (res).
export default async function handler(req: any, res: any) {
  // Đặt các header CORS để cho phép yêu cầu từ bất kỳ nguồn gốc nào.
  // Điều này quan trọng để cho phép frontend của bạn (ngay cả trên localhost) giao tiếp với API này.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Trình duyệt có thể gửi một yêu cầu OPTIONS trước (một "preflight" check).
  // Nếu vậy, chúng ta chỉ cần trả lời với trạng thái 200 OK để xác nhận rằng có thể gửi yêu cầu POST thực tế.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chúng ta chỉ muốn xử lý các yêu cầu POST để tạo bài đăng.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Lấy access token bí mật từ biến môi trường của Vercel.
  // Đây là cách an toàn để xử lý các thông tin bí mật.
  const accessToken = process.env.FB_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('FB_ACCESS_TOKEN is not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Missing API token.' });
  }

  try {
    // Lấy chi tiết bài đăng từ phần thân yêu cầu được gửi bởi frontend.
    const { targetId, message, imageUrls } = req.body;

    // Xác thực cơ bản để đảm bảo chúng ta có dữ liệu cần thiết.
    if (!targetId || !message) {
      return res.status(400).json({ error: 'Missing targetId or message in request body.' });
    }
    
    // Kiểm tra xem có hình ảnh để tải lên không.
    // API của Facebook xử lý bài đăng một ảnh và nhiều ảnh khác nhau.
    // Để đơn giản và mạnh mẽ, chúng ta sẽ đăng từng ảnh một nếu có nhiều ảnh được cung cấp.
    // Điểm cuối Graph API cho bài đăng nhiều ảnh phức tạp hơn và không được sử dụng ở đây.
    if (imageUrls && imageUrls.length > 0) {
      // Ví dụ này xử lý ảnh đầu tiên. Một phiên bản nâng cao hơn có thể lặp và tạo album hoặc nhiều bài đăng.
      const imageUrl = imageUrls[0];

      // Vì hình ảnh là một data URL (base64), chúng ta cần chuyển đổi nó thành Blob để gửi đi.
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      
      const formData = new FormData();
      // Đối với việc tải ảnh lên, thông điệp được gọi là 'caption'.
      formData.append('caption', message);
      // 'source' là trường dành cho dữ liệu hình ảnh.
      formData.append('source', imageBlob);

      // Điểm cuối để tải ảnh lên khác với feed chỉ có văn bản.
      // access_token PHẢI là một tham số URL cho các yêu cầu multipart/form-data.
      const fbApiUrl = `https://graph.facebook.com/${targetId}/photos?access_token=${accessToken}`;

      const fbResponse = await fetch(fbApiUrl, {
          method: 'POST',
          body: formData, // Không cần header 'Content-Type'; fetch sẽ tự đặt nó cho FormData.
      });

      const result = await fbResponse.json();

      if (!fbResponse.ok) {
          console.error('Facebook API Error (Image Post):', result.error);
          throw new Error(result.error?.message || 'Failed to post image to Facebook.');
      }
      
      // Phản hồi cho một lần tải ảnh thành công chứa `post_id`.
      // Chúng ta trả về nó ở cùng định dạng với bài đăng văn bản để đảm bảo tính nhất quán.
      return res.status(200).json({ id: result.post_id || result.id });

    } else {
      // Khối này xử lý các bài đăng chỉ có văn bản.
      const endpoint = `https://graph.facebook.com/${targetId}/feed`;

      const params = new URLSearchParams();
      params.append('access_token', accessToken);
      params.append('message', message);
      
      const fbResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
      });

      const result = await fbResponse.json();

      if (!fbResponse.ok) {
          console.error('Facebook API Error (Text Post):', result.error);
          throw new Error(result.error?.message || 'Failed to post to Facebook.');
      }

      // Gửi phản hồi thành công từ Facebook trở lại frontend của chúng ta.
      return res.status(200).json(result);
    }

  } catch (error) {
    // Nếu có bất kỳ sự cố nào xảy ra, ghi lại lỗi trên máy chủ và gửi một thông báo lỗi chung cho frontend.
    console.error('Error in serverless function:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
        }
