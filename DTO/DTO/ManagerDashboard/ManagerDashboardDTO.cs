using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.ManagerDashboard
{
    public class ManagerDashboardDTO
    {
        public long TodayRevenue { get; set; }
        public int TodayOrderCount { get; set; }
        public int TotalFoodItemCount { get; set; }
        public IEnumerable<OrderDTO> RecentOrders { get; set; }
        public List<ChartDataPoint> RevenueChartData { get; set; }
        public List<ChartDataPoint> TopSellingFoods { get; set; } // Label: Tên món, Value: Số lượng
        public List<ChartDataPoint> OrderStatusStats { get; set; } // Label: Tên trạng thái, Value: Số lượng
    }
    public class ChartDataPoint
    {
        public string Label { get; set; } // Ví dụ: "01/11", "02/11"
        public long Value { get; set; }   // Doanh thu
    }
}
