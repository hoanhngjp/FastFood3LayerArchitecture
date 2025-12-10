using DTO.DTO.Payment;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.PaymentService
{
    public interface IPaymentService
    {
        Task<IEnumerable<PaymentTransactionDTO>> GetAllForAdminAsync();
    }
}
