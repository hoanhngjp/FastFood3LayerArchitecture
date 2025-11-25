using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.ManagerDashboard;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DashboardService
{
    public class DashboardService : IDashboardService
    {
        private readonly IUnitOfWork _uow;
        private readonly string _timeZoneId;

        public DashboardService(IUnitOfWork uow, IConfiguration config)
        {
            _uow = uow;
            _timeZoneId = config["TimeZoneId"];

            if (string.IsNullOrEmpty(_timeZoneId))
            {
                throw new InvalidOperationException("TimeZoneId is not configured in appsettings.json.");
            }
        }
        private (DateTime startOfDayUtc, DateTime endOfDayUtc) GetTodayTimeRange()
        {
            var timeZoneInfo = TimeZoneInfo.FindSystemTimeZoneById(_timeZoneId);
            var nowInTimeZone = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZoneInfo);
            var startOfDay = nowInTimeZone.Date;
            var endOfDay = startOfDay.AddDays(1).AddTicks(-1);
            var startOfDayUtc = TimeZoneInfo.ConvertTimeToUtc(startOfDay, timeZoneInfo);
            var endOfDayUtc = TimeZoneInfo.ConvertTimeToUtc(endOfDay, timeZoneInfo);
            return (startOfDayUtc, endOfDayUtc);
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
                StatusName = o.OrderStatus?.StatusName,
                TotalAmount = o.TotalAmount,
                UpdatedAt = o.UpdatedAt,
                Items = o.OrderItems.Select(i => new OrderItemDTO
                {
                    FoodID = i.FoodID,
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList()
            };
        }
        public async Task<ManagerDashboardDTO> GetTodayStatisticsAsync(int restaurantId)
        {
            var (startOfDayUtc, endOfDayUtc) = GetTodayTimeRange();

            var allOrders = await _uow.Orders.GetAllWithDetailsAsync();
            var todayOrders = allOrders
                .Where(o => o.RestaurantID == restaurantId &&
                            o.OrderTime >= startOfDayUtc &&
                            o.OrderTime <= endOfDayUtc)
                .OrderByDescending(o => o.OrderTime)
                .ToList();

            var successTransactionsTask = GetSuccessfulTransactionsAsync(restaurantId, startOfDayUtc, endOfDayUtc);

            var totalFoodCountTask = GetTotalFoodCountAsync();

            await Task.WhenAll(successTransactionsTask, totalFoodCountTask);

            var successTransactions = await successTransactionsTask;
            var totalFoodCount = await totalFoodCountTask;

            var recentOrders = todayOrders.Take(5).Select(MapOrderToDTO);

            long todayRevenue = successTransactions.Sum(p => (long)p.Amount);
            int todayOrderCount = todayOrders.Count();

            return new ManagerDashboardDTO
            {
                TodayRevenue = todayRevenue,
                TodayOrderCount = todayOrderCount,
                TotalFoodItemCount = totalFoodCount,
                RecentOrders = recentOrders
            };
        }
        private async Task<IEnumerable<PaymentTransaction>> GetSuccessfulTransactionsAsync(int restaurantId, DateTime startOfDayUtc, DateTime endOfDayUtc)
        {
            // Lấy status "Success"
            var successStatus = (await _uow.Repository<PaymentTransactionStatus>()
                                    .FindAsync(s => s.StatusName == "Success"))
                                    .FirstOrDefault();
            if (successStatus == null) return Enumerable.Empty<PaymentTransaction>();

            // Lấy ID các đơn hàng của nhà hàng này
            var restaurantOrderIds = (await _uow.Repository<Order>()
                                         .FindAsync(o => o.RestaurantID == restaurantId))
                                         .Select(o => o.OrderID);

            if (!restaurantOrderIds.Any()) return Enumerable.Empty<PaymentTransaction>();

            // Lấy các giao dịch thành công
            var transactions = await _uow.Repository<PaymentTransaction>().FindAsync(
                p => restaurantOrderIds.Contains(p.OrderID) &&
                     p.StatusID == successStatus.StatusID &&
                     p.PaymentDate >= startOfDayUtc &&
                     p.PaymentDate <= endOfDayUtc
            );

            return transactions;
        }
        private async Task<int> GetTotalFoodCountAsync()
        {
            var allItems = await _uow.Repository<FoodItem>().GetAllAsync();
            return allItems.Count();
        }
    }
}
