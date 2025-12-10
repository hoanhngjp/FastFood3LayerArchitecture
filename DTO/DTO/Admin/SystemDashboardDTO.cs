using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Admin
{
    public class SystemDashboardDTO
    {
        public int TotalUsers { get; set; }
        public int TotalRestaurants { get; set; }
        public int TotalOrders { get; set; }
        public long TotalRevenue { get; set; } // Tổng tiền toàn hệ thống
    }
}
