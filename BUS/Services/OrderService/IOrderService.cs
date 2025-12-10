using DTO.DTO;
using DTO.DTO.Order;
using DTO.DTO.Restaurant;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services
{
    public enum UpdateStatusResult
    {
        Success,
        OrderNotFound,
        StatusNotFound,
        NotPaid,
        AlreadyProcessed,
        PermissionDenied
    }
    public interface IOrderService
    {
        Task<IEnumerable<OrderDTO>> GetAllAsync();
        Task<OrderDTO?> GetByIdAsync(int id);
        Task<OrderCreationResponseDTO> CreateAsync(OrderDTO dto, int userIdFromToken);
        Task<UpdateStatusResult> UpdateStatusAsync(int orderId, string status);
        Task<bool> DeleteAsync(int id);
        Task<IEnumerable<OrderDTO>> GetMyOrdersAsync(int userId);
        Task<IEnumerable<OrderDTO>> GetOrdersForRestaurantAsync(int restaurantId, string statusFilter, int managerUserId);
        Task<UpdateStatusResult> ConfirmOrderAsync(int orderId, int managerUserId);
        Task<UpdateStatusResult> CancelOrderAsync(int orderId, int managerUserId);
        Task<OrderTrackingDTO?> GetOrderTrackingAsync(int orderId);
        Task<UpdateStatusResult> ConfirmOrderAsAdminAsync(int orderId);
        Task<bool> UpdateStatusAsAdminAsync(int orderId, int statusId);
    }
}
