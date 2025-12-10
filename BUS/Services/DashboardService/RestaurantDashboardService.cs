using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.ManagerDashboard;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
// Nhớ import Namespace chứa Entity và DTO của bạn, ví dụ:
// using DAO.Entities;
// using BUS.DTOs;
// using BUS.Interfaces;

namespace BUS.Services.DashboardService
{
    public class RestaurantDashboardService : IRestaurantDashboardService
    {
        private readonly IUnitOfWork _uow;
        private readonly string _timeZoneId;

        // Định nghĩa hằng số cho code dễ đọc
        private const int PAYMENT_SUCCESS_ID = 1;

        public RestaurantDashboardService(IUnitOfWork uow, IConfiguration config)
        {
            _uow = uow;
            _timeZoneId = config["TimeZoneId"];

            if (string.IsNullOrEmpty(_timeZoneId))
            {
                _timeZoneId = "SE Asia Standard Time"; // Mặc định giờ VN
            }
        }

        private (DateTime startOfDayUtc, DateTime endOfDayUtc) GetTodayTimeRange()
        {
            try
            {
                var timeZoneInfo = TimeZoneInfo.FindSystemTimeZoneById(_timeZoneId);
                var nowInTimeZone = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZoneInfo);
                var startOfDay = nowInTimeZone.Date;
                var endOfDay = startOfDay.AddDays(1).AddTicks(-1);

                return (
                    TimeZoneInfo.ConvertTimeToUtc(startOfDay, timeZoneInfo),
                    TimeZoneInfo.ConvertTimeToUtc(endOfDay, timeZoneInfo)
                );
            }
            catch
            {
                var now = DateTime.UtcNow;
                return (now.Date, now.Date.AddDays(1).AddTicks(-1));
            }
        }

        private OrderDTO MapOrderToDTO(Order o)
        {
            if (o == null) return null;
            return new OrderDTO
            {
                OrderID = o.OrderID,
                UserID = o.UserID,
                AdrsID = o.AdrsID,
                RestaurantID = o.RestaurantID,
                OrderTime = o.OrderTime,
                StatusID = o.StatusID,
                StatusName = o.OrderStatus?.StatusName ?? "Unknown",
                TotalAmount = o.TotalAmount,
                UpdatedAt = o.UpdatedAt,
                // FIX LỖI 500 TIỀM ẨN: Kiểm tra null OrderItems
                Items = o.OrderItems?.Select(i => new OrderItemDTO
                {
                    FoodID = i.FoodID,
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList() ?? new List<OrderItemDTO>()
            };
        }
        public async Task<ManagerDashboardDTO> GetDashboardStatisticsAsync(int restaurantId, string filterType, DateTime? fromDate, DateTime? toDate)
        {
            // 1. XÁC ĐỊNH THỜI GIAN
            DateTime startUtc, endUtc;
            var nowUtc = DateTime.UtcNow;

            switch (filterType?.ToLower())
            {
                case "custom": // Logic MỚI
                    if (fromDate.HasValue && toDate.HasValue)
                    {
                        startUtc = fromDate.Value.Date; // 00:00:00
                        endUtc = toDate.Value.Date.AddDays(1).AddTicks(-1); // 23:59:59
                    }
                    else // Fallback nếu user chọn custom mà ko nhập ngày
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

            // 2. QUERY DB (Lấy Orders trong khoảng thời gian)
            var allOrders = await _uow.Orders.GetAllWithDetailsAsync();

            var periodOrders = allOrders
                .Where(o => o.RestaurantID == restaurantId &&
                            o.OrderTime >= startUtc &&
                            o.OrderTime <= endUtc)
                .ToList();

            // 3. TÍNH TOÁN CƠ BẢN
            var successTransactions = await GetSuccessfulTransactionsAsync(restaurantId, startUtc, endUtc);

            long revenue = (long)successTransactions.Sum(p => p.Amount);
            int orderCount = periodOrders.Count;
            int foodCount = await GetTotalFoodCountAsync();

            // 4. BIỂU ĐỒ 1: DOANH THU (Line Chart)
            var chartData = successTransactions
                .GroupBy(t => t.PaymentDate.Value.Date)
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key.ToString("dd/MM"),
                    Value = (long)g.Sum(t => t.Amount)
                })
                .OrderBy(c => c.Label)
                .ToList();

            // 5. BIỂU ĐỒ 2: TOP MÓN BÁN CHẠY (Bar Chart) - MỚI
            // Chỉ tính từ các đơn hàng thành công/đã xác nhận để chính xác
            var topFoods = periodOrders
                .Where(o => o.OrderItems != null)
                .SelectMany(o => o.OrderItems)
                .GroupBy(i => i.FoodItem?.FoodName ?? "Unknown")
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key,
                    Value = g.Sum(i => i.Quantity)
                })
                .OrderByDescending(x => x.Value)
                .Take(5) // Lấy top 5
                .ToList();

            // 6. BIỂU ĐỒ 3: TỶ LỆ TRẠNG THÁI (Doughnut Chart) - MỚI
            var statusStats = periodOrders
                .GroupBy(o => o.OrderStatus?.StatusName ?? "Unknown")
                .Select(g => new ChartDataPoint
                {
                    Label = g.Key, // Pending, Success, Cancelled...
                    Value = g.Count()
                })
                .ToList();

            var recentOrders = periodOrders.OrderByDescending(o => o.OrderTime).Take(5).Select(MapOrderToDTO).ToList();

            return new ManagerDashboardDTO
            {
                TodayRevenue = revenue,
                TodayOrderCount = orderCount,
                TotalFoodItemCount = foodCount,
                RecentOrders = recentOrders,
                RevenueChartData = chartData,
                TopSellingFoods = topFoods,       // Data mới
                OrderStatusStats = statusStats    // Data mới
            };
        }
        private async Task<IEnumerable<PaymentTransaction>> GetSuccessfulTransactionsAsync(int restaurantId, DateTime start, DateTime end)
        {
            // Bước 1: Lấy danh sách OrderID của nhà hàng
            var allOrders = await _uow.Repository<Order>().GetAllAsync();
            var restaurantOrderIds = allOrders
                                    .Where(o => o.RestaurantID == restaurantId)
                                    .Select(o => o.OrderID)
                                    .ToList();

            if (!restaurantOrderIds.Any()) return Enumerable.Empty<PaymentTransaction>();

            // Bước 2: Lấy giao dịch thành công (StatusID == 1)
            var allTrans = await _uow.Repository<PaymentTransaction>().GetAllAsync();

            // FIX LỖI 500 CHÍNH: Dùng trực tiếp StatusID == 1
            var transactions = allTrans.Where(
                p => restaurantOrderIds.Contains(p.OrderID) &&
                     p.StatusID == PAYMENT_SUCCESS_ID &&
                     p.PaymentDate >= start &&
                     p.PaymentDate <= end
            );

            return transactions;
        }

        private async Task<int> GetTotalFoodCountAsync()
        {
            // Đếm tổng số món ăn hiện có trong kho (Global Menu)
            var allItems = await _uow.Repository<FoodItem>().GetAllAsync();
            return allItems.Count();
        }
    }
}