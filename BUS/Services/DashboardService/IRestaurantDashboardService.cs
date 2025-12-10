using DTO.DTO.ManagerDashboard;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DashboardService
{
    public interface IRestaurantDashboardService
    {
        Task<ManagerDashboardDTO> GetDashboardStatisticsAsync(int restaurantId, string filterType, DateTime? fromDate, DateTime? toDate);
    }
}
