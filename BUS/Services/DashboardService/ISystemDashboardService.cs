using DTO.DTO.Admin;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DashboardService
{
    public interface ISystemDashboardService
    {
        Task<AdminDashboardDTO> GetSystemOverviewAsync(int? restaurantId, string filterType, DateTime? fromDate, DateTime? toDate);

    }
}
