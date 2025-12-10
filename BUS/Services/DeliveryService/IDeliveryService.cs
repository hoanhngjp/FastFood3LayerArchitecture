using DTO.DTO.Delivery;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DeliveryService
{
    public interface IDeliveryService
    {
        Task<IEnumerable<DeliveryDTO>> GetAllForAdminAsync();
        Task<DeliveryDTO?> GetByIdAsync(int id);
        Task<bool> UpdateStatusAsAdminAsync(int deliveryId, int statusId);
    }
}
