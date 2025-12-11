using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.Admin;
using DTO.DTO.ManagerDashboard;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DashboardService
{
    public class SystemDashboardService : ISystemDashboardService
    {
        private readonly IUnitOfWork _uow;
        private const int PAYMENT_SUCCESS_ID = 1;

        public SystemDashboardService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        // CẬP NHẬT: Thêm tham số restaurantId
        public async Task<AdminDashboardDTO> GetSystemOverviewAsync(int? restaurantId, string filterType, DateTime? fromDate, DateTime? toDate)
        {
            // ---------------------------------------------------------
            // 1. XÁC ĐỊNH KHOẢNG THỜI GIAN (Time Filter)
            // ---------------------------------------------------------
            DateTime startUtc, endUtc;
            var nowUtc = DateTime.UtcNow;

            switch (filterType?.ToLower())
            {
                case "custom":
                    if (fromDate.HasValue && toDate.HasValue)
                    {
                        startUtc = fromDate.Value.Date;
                        endUtc = toDate.Value.Date.AddDays(1).AddTicks(-1); // Cuối ngày
                    }
                    else
                    {
                        startUtc = nowUtc.Date;
                        endUtc = nowUtc.Date.AddDays(1).AddTicks(-1);
                    }
                    break;
                case "week":
                    startUtc = nowUtc.AddDays(-7).Date;
                    endUtc = nowUtc.Date.AddDays(1).AddTicks(-1);
                    break;
                case "month":
                    startUtc = new DateTime(nowUtc.Year, nowUtc.Month, 1);
                    endUtc = nowUtc.Date.AddDays(1).AddTicks(-1);
                    break;
                case "year":
                    startUtc = new DateTime(nowUtc.Year, 1, 1);
                    endUtc = nowUtc.Date.AddDays(1).AddTicks(-1);
                    break;
                case "today":
                default:
                    startUtc = nowUtc.Date;
                    endUtc = nowUtc.Date.AddDays(1).AddTicks(-1);
                    break;
            }

            // ---------------------------------------------------------
            // 2. TRUY VẤN DỮ LIỆU (Query Data)
            // ---------------------------------------------------------

            // A. Lấy Đơn hàng (Orders) - Kèm thông tin liên quan
            // Lưu ý: GetAllWithDetailsAsync nên Include: Restaurant, OrderStatus, User
            var allOrdersQuery = await _uow.Orders.GetAllWithDetailsAsync();

            // Lọc theo thời gian
            var periodOrders = allOrdersQuery
                .Where(o => o.OrderTime >= startUtc && o.OrderTime <= endUtc);

            // Lọc theo Nhà hàng (nếu có chọn)
            if (restaurantId.HasValue && restaurantId.Value > 0)
            {
                periodOrders = periodOrders.Where(o => o.RestaurantID == restaurantId.Value);
            }

            var periodOrdersList = periodOrders.ToList(); // Thực thi Query ra List

            // B. Lấy Giao dịch (Transactions) - Chỉ lấy của các đơn hàng đã lọc ở trên
            var validOrderIds = periodOrdersList.Select(o => o.OrderID).ToList();

            var transactions = (await _uow.Repository<PaymentTransaction>()
                .GetAsync(filter: t => t.StatusID == PAYMENT_SUCCESS_ID
                                       && validOrderIds.Contains(t.OrderID)))
                .ToList();

            // C. Lấy Danh sách Drone (Hạm đội)
            // Drone là tài nguyên hệ thống, nhưng nếu muốn lọc theo nhà hàng thì cần logic riêng.
            // Ở đây ta lấy TOÀN BỘ Drone để hiển thị tình trạng chung.
            var droneList = (await _uow.Repository<Drone>()
                .GetAsync(includeProperties: "DroneStatus"))
                .ToList();

            // ---------------------------------------------------------
            // 3. TÍNH TOÁN SỐ LIỆU TỔNG QUAN (Cards)
            // ---------------------------------------------------------

            long totalRevenue = (long)transactions.Sum(t => t.Amount);
            int totalOrders = periodOrdersList.Count;
            // Đếm số người dùng mua hàng trong kỳ (Distinct UserID)
            int totalUsers = periodOrdersList.Select(o => o.UserID).Distinct().Count();

            int totalDrones = droneList.Count;
            // Đếm drone đang hoạt động (không phải Idle hoặc Maintenance)
            int activeDrones = droneList.Count(d => d.DroneStatus?.StatusName != "Idle" && d.DroneStatus?.StatusName != "Maintenance");

            // ---------------------------------------------------------
            // 4. XỬ LÝ DỮ LIỆU BIỂU ĐỒ (Charts)
            // ---------------------------------------------------------

            // [BIỂU ĐỒ 1] Doanh thu (Line Chart) - Gom nhóm theo Ngày
            var revenueChart = transactions
                .Where(t => t.PaymentDate.HasValue)
                .GroupBy(t => t.PaymentDate.Value.Date)
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key.ToString("dd/MM"),
                    Value = (long)g.Sum(t => t.Amount)
                })
                .OrderBy(c => c.Label)
                .ToList();

            // [BIỂU ĐỒ 2] Số lượng đơn hàng (Bar Chart) - Gom nhóm theo Ngày
            var orderCountChart = periodOrdersList
                .GroupBy(o => o.OrderTime.Date)
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key.ToString("dd/MM"),
                    Value = g.Count()
                })
                .OrderBy(c => c.Label)
                .ToList();

            // [BIỂU ĐỒ 3] Tỷ lệ Trạng thái Đơn hàng (Pie Chart)
            var orderStatusChart = periodOrdersList
                .GroupBy(o => o.OrderStatus?.StatusName ?? "Unknown")
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key,
                    Value = g.Count()
                })
                .ToList();

            // [BIỂU ĐỒ 4] Trạng thái Drone (Pie Chart)
            var droneStatusChart = droneList
                .GroupBy(d => d.DroneStatus?.StatusName ?? "Unknown")
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key,
                    Value = g.Count()
                })
                .ToList();

            // [BIỂU ĐỒ 5] Tình trạng Pin Drone (Bar Chart - Phân loại)
            var droneBatteryChart = new List<ChartDataPoint>
            {
                new ChartDataPoint { Label = "Pin Cao (>50%)", Value = droneList.Count(d => (d.CurrentBattery ?? 0) > 50) },
                new ChartDataPoint { Label = "Trung bình (20-50%)", Value = droneList.Count(d => (d.CurrentBattery ?? 0) <= 50 && (d.CurrentBattery ?? 0) >= 20) },
                new ChartDataPoint { Label = "Pin Yếu (<20%)", Value = droneList.Count(d => (d.CurrentBattery ?? 0) < 20) }
            };

            // [BIỂU ĐỒ 6] Top Nhà hàng theo Doanh thu (Doughnut Chart)
            var topRes = periodOrdersList
                .Where(o => o.OrderStatus?.StatusName == "Completed" || o.OrderStatus?.StatusName == "Delivered")
                .GroupBy(o => o.Restaurant?.Name ?? "Unknown")
                .Select(g => new TopRestaurantDTO
                {
                    Name = g.Key,
                    Revenue = (long)g.Sum(o => o.TotalAmount)
                })
                .OrderByDescending(r => r.Revenue)
                .Take(5)
                .ToList();

            // ---------------------------------------------------------
            // 5. DANH SÁCH ĐƠN HÀNG GẦN ĐÂY (Recent Orders Table)
            // ---------------------------------------------------------
            var recentOrders = periodOrdersList
                .OrderByDescending(o => o.OrderTime)
                .Take(10)
                .Select(o => new OrderDTO
                {
                    OrderID = o.OrderID,
                    RestaurantName = o.Restaurant?.Name,
                    UserID = o.UserID,
                    TotalAmount = o.TotalAmount,
                    StatusName = o.OrderStatus?.StatusName,
                    OrderTime = o.OrderTime
                })
                .ToList();

            // ---------------------------------------------------------
            // 6. TRẢ VỀ DTO
            // ---------------------------------------------------------
            return new AdminDashboardDTO
            {
                // Số liệu tổng
                TotalRevenue = totalRevenue,
                TotalOrders = totalOrders,
                TotalUsers = totalUsers,
                TotalDrones = totalDrones,
                ActiveDrones = activeDrones,

                // Dữ liệu biểu đồ
                RevenueChart = revenueChart,
                OrderCountChart = orderCountChart,
                OrderStatusChart = orderStatusChart,
                DroneStatusChart = droneStatusChart,
                DroneBatteryChart = droneBatteryChart,

                // Dữ liệu bảng & Top
                TopRestaurants = topRes,
                RecentOrders = recentOrders
            };
        }
    }
}
