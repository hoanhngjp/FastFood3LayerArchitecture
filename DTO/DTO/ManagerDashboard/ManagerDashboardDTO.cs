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
    }
}
