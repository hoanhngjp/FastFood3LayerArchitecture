using DTO.DTO.ManagerDashboard;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Admin
{
    public class AdminDashboardDTO
    {
        // 4 Thẻ chỉ số
        public long TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public int TotalUsers { get; set; }
        public int TotalDrones { get; set; }
        public int ActiveDrones { get; set; }

        // Biểu đồ & Bảng
        public List<ChartDataPoint> RevenueChart { get; set; }
        public List<ChartDataPoint> OrderCountChart { get; set; }
        public List<ChartDataPoint> OrderStatusChart { get; set; }
        public List<ChartDataPoint> DroneStatusChart { get; set; }  // Idle, Busy, Maintenance...
        public List<ChartDataPoint> DroneBatteryChart { get; set; } // Good, Medium, Low

        public List<TopRestaurantDTO> TopRestaurants { get; set; }
        public IEnumerable<OrderDTO> RecentOrders { get; set; }
    }

    public class TopRestaurantDTO
    {
        public string Name { get; set; }
        public long Revenue { get; set; }
    }
}
