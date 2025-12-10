using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO.Payment;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.PaymentService
{
    public class PaymentService : IPaymentService
    {
        private readonly IUnitOfWork _uow;

        public PaymentService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<IEnumerable<PaymentTransactionDTO>> GetAllForAdminAsync()
        {
            // Include: Order -> User (để lấy tên khách), PaymentStatus
            var transactions = await _uow.Repository<PaymentTransaction>()
                .GetAsync(includeProperties: "Order,Order.User,PaymentTransactionStatus");

            // Sắp xếp mới nhất lên đầu
            return transactions.OrderByDescending(t => t.PaymentDate).Select(MapToDTO);
        }

        private PaymentTransactionDTO MapToDTO(PaymentTransaction t)
        {
            return new PaymentTransactionDTO
            {
                TransactionID = t.TransactionID,
                TransactionNo = t.vnp_TransactionNo,
                OrderID = t.OrderID,
                // Check null an toàn
                CustomerName = t.Order?.User?.FullName ?? "Unknown User",
                Amount = t.Amount,
                BankCode = t.BankCode,
                OrderInfo = t.OrderInfo,
                PaymentDate = t.PaymentDate,
                StatusID = t.StatusID,
                StatusName = t.PaymentTransactionStatus?.StatusName ?? (t.StatusID == 1 ? "Success" : "Failed")
            };
        }
    }
}
