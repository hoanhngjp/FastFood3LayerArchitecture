using DTO.DTO.ManagerDashboard;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DashboardService
{
    public interface IDashboardService
    {
        Task<ManagerDashboardDTO> GetTodayStatisticsAsync(int restaurantId);
    }
}
