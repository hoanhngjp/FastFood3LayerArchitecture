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
            // 1. XÁC ĐỊNH THỜI GIAN
            DateTime startUtc, endUtc;
            var nowUtc = DateTime.UtcNow;

            switch (filterType?.ToLower())
            {
                case "custom":
                    if (fromDate.HasValue && toDate.HasValue)
                    {
                        startUtc = fromDate.Value.Date;
                        endUtc = toDate.Value.Date.AddDays(1).AddTicks(-1);
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

            // --- LẤY DỮ LIỆU ---

            // A. Đơn hàng (Orders) - Lọc theo Thời gian & Nhà hàng
            var allOrdersQuery = await _uow.Orders.GetAllWithDetailsAsync(); // Lấy kèm Restaurant, Status

            var periodOrders = allOrdersQuery
                .Where(o => o.OrderTime >= startUtc && o.OrderTime <= endUtc);

            // [FILTER] Nếu có chọn nhà hàng
            if (restaurantId.HasValue && restaurantId.Value > 0)
            {
                periodOrders = periodOrders.Where(o => o.RestaurantID == restaurantId.Value);
            }

            var periodOrdersList = periodOrders.ToList(); // Execute Query

            // B. Giao dịch (Transactions) - Phải lọc theo OrderID của tập order trên
            // Lấy danh sách OrderID hợp lệ
            var validOrderIds = periodOrdersList.Select(o => o.OrderID).ToList();

            var transactions = (await _uow.Repository<PaymentTransaction>()
                .GetAsync(filter: t => t.StatusID == PAYMENT_SUCCESS_ID
                                       && validOrderIds.Contains(t.OrderID))) // Chỉ lấy trans của các order đã lọc
                .ToList();

            // C. Các chỉ số Snapshot (User/Drone)
            // Nếu chọn cụ thể 1 quán, User/Drone có thể không cần lọc (hoặc để 0 tùy nghiệp vụ).
            // Ở đây mình giữ nguyên System Stats cho Drones, nhưng Users đếm theo đơn hàng đã lọc.
            var totalUsers = periodOrdersList.Select(o => o.UserID).Distinct().Count();

            var drones = await _uow.Repository<Drone>().GetAsync(includeProperties: "DroneStatus");
            var totalDrones = drones.Count(); // Drone là tài nguyên chung, không lọc theo quán
            var activeDrones = drones.Count(d => d.DroneStatus?.StatusName != "Idle" && d.DroneStatus?.StatusName != "Maintenance");

            // --- TÍNH TOÁN ---

            long totalRevenue = (long)transactions.Sum(t => t.Amount);
            int totalOrders = periodOrdersList.Count;

            // 1. Biểu đồ Doanh thu
            var chartData = transactions
                .Where(t => t.PaymentDate.HasValue)
                .GroupBy(t => t.PaymentDate.Value.Date)
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key.ToString("dd/MM"),
                    Value = (long)g.Sum(t => t.Amount)
                })
                .OrderBy(c => c.Label)
                .ToList();

            // 2. Top Nhà hàng (Nếu đã chọn 1 quán thì chỉ hiện 1 quán đó)
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

            // 3. Đơn hàng gần đây
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

            return new AdminDashboardDTO
            {
                TotalRevenue = totalRevenue,
                TotalOrders = totalOrders,
                TotalUsers = totalUsers,
                TotalDrones = totalDrones,
                ActiveDrones = activeDrones,
                RevenueChart = chartData,
                TopRestaurants = topRes,
                RecentOrders = recentOrders
            };
        }
    }
}
