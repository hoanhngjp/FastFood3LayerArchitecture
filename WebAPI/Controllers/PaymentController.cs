using BUS.Services.CartService;
using BUS.Services.PaymentService;
using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO.Payment;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("payments")]
    public class PaymentController : ControllerBase
    {
        private readonly IVnPayService _vnPayService;
        private readonly IUnitOfWork _uow;
        private readonly IConfiguration _config;
        private readonly ICartService _cartService;

        public PaymentController(IVnPayService vnPayService, IUnitOfWork uow, IConfiguration config, ICartService cartService)
        {
            _vnPayService = vnPayService;
            _uow = uow;
            _config = config;
            _cartService = cartService;
        }

        [HttpGet("vnpay-return")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> VnpayReturn() // Đổi thành async Task
        {
            var vnpayParams = HttpContext.Request.Query;
            var response = _vnPayService.PaymentExecute(vnpayParams);

            var guiBaseUrl = _config["GUI_BASE_URL"] ?? "http://192.168.36.97:5278";
            string redirectUrl = $"{guiBaseUrl}/Checkout/Success?";

            // Xử lý lấy OrderId gốc
            var orderIdString = response?.OrderId ?? "0";
            var realOrderId = orderIdString.Split('_')[0];

            if (response == null || !response.Success)
            {
                // GIAO DỊCH THẤT BẠI
                var msg = Uri.EscapeDataString("Giao dịch thất bại hoặc bị hủy: " + response?.VnPayResponseCode);
                redirectUrl += $"isSuccess=false&orderId={realOrderId}&message={msg}";
            }
            else
            {
                // GIAO DỊCH THÀNH CÔNG -> LƯU VÀO DB NGAY TẠI ĐÂY
                // (Vì IPN không chạy được trên mạng LAN)
                try
                {
                    await ProcessPaymentSuccess(response, vnpayParams);
                    await _cartService.ClearCartAsync();
                    var msg = Uri.EscapeDataString("Giao dịch thành công");
                    redirectUrl += $"isSuccess=true&orderId={realOrderId}&message={msg}";
                }
                catch (Exception ex)
                {
                    // Trường hợp lưu DB lỗi nhưng tiền đã trừ (hiếm gặp)
                    var msg = Uri.EscapeDataString("Thanh toán thành công nhưng lỗi lưu đơn hàng: " + ex.Message);
                    redirectUrl += $"isSuccess=true&orderId={realOrderId}&message={msg}"; // Vẫn báo success để khách đỡ hoảng
                }
            }

            return Redirect(redirectUrl);
        }

        // Hàm phụ trợ để xử lý lưu DB (Dùng chung logic)
        private async Task ProcessPaymentSuccess(PaymentResponseModel response, IQueryCollection vnpayParams)
        {
            var realOrderId = response.OrderId.Split('_')[0];
            if (!int.TryParse(realOrderId, out int orderId)) return;

            var order = await _uow.Orders.GetByIdAsync(orderId);
            if (order == null) return;

            // Kiểm tra số tiền (Chia 100 vì VNPay nhân 100)
            long vnpAmount = Convert.ToInt64(vnpayParams.FirstOrDefault(k => k.Key == "vnp_Amount").Value) / 100;
            if (order.TotalAmount != vnpAmount) return;

            // Kiểm tra trạng thái đơn hàng (để tránh lưu trùng nếu F5 lại trang)
            var pendingStatus = (await _uow.Repository<OrderStatus>().FindAsync(s => s.StatusName == "Pending")).FirstOrDefault();

            // Nếu đơn hàng không phải Pending (tức là đã Paid rồi), thì bỏ qua không lưu nữa
            if (pendingStatus != null && order.StatusID != pendingStatus.StatusID) return;

            // Lưu Transaction
            var paymentStatus = (await _uow.Repository<PaymentTransactionStatus>().FindAsync(s => s.StatusName == "Success")).FirstOrDefault();

            // Kiểm tra xem Transaction này đã tồn tại chưa (Chống trùng lặp)
            var existingTrans = (await _uow.Repository<PaymentTransaction>()
                .FindAsync(t => t.vnp_TransactionNo == response.TransactionId)).FirstOrDefault();

            if (existingTrans == null)
            {
                var newTransaction = new PaymentTransaction
                {
                    vnp_TransactionNo = response.TransactionId,
                    OrderID = order.OrderID,
                    OrderInfo = response.OrderDescription,
                    StatusID = paymentStatus?.StatusID ?? 1, // Fallback ID nếu null
                    PaymentDate = DateTime.UtcNow,
                    BankCode = vnpayParams.FirstOrDefault(k => k.Key == "vnp_BankCode").Value,
                    ResponseCode = response.VnPayResponseCode,
                    Amount = order.TotalAmount
                };

                await _uow.Repository<PaymentTransaction>().AddAsync(newTransaction);

                // --- CẬP NHẬT TRẠNG THÁI ORDER LÊN PAID/CONFIRMED ---
                // (Bạn nên thêm logic này nếu muốn đơn hàng đổi trạng thái luôn)
                // var paidStatus = (await _uow.Repository<OrderStatus>().FindAsync(s => s.StatusName == "Paid")).FirstOrDefault();
                // if (paidStatus != null) 
                // {
                //     order.StatusID = paidStatus.StatusID;
                //     _uow.Orders.Update(order);
                // }
                // -----------------------------------------------------

                await _uow.SaveChangesAsync();
            }
        }

        [HttpGet("vnpay-ipn")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> VnpayIpnReturn()
        {
            // Vẫn giữ API này cho Production (Khi nào đưa lên host thật thì nó sẽ chạy)
            var vnpayParams = HttpContext.Request.Query;
            var response = _vnPayService.PaymentExecute(vnpayParams);

            if (response == null || !response.Success)
            {
                return Content(JsonSerializer.Serialize(new { RspCode = "97", Message = "Invalid signature" }), "application/json");
            }

            // Gọi lại hàm xử lý chung
            await ProcessPaymentSuccess(response, vnpayParams);

            return Content(JsonSerializer.Serialize(new { RspCode = "00", Message = "Confirm Success" }), "application/json");
        }
    }
}