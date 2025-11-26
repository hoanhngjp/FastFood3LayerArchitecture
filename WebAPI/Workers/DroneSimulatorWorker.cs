using Common;
using DAT.Entity;
using DAT.UnitOfWork;

namespace WebAPI.Workers
{
    public class DroneSimulatorWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DroneSimulatorWorker> _logger;

        public DroneSimulatorWorker(IServiceProvider serviceProvider, ILogger<DroneSimulatorWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Drone Simulator Worker started running...");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SimulateDeliveryProcess();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Drone Simulation.");
                }

                // Chạy chu kỳ mỗi 2 giây (để chuyển động mượt hơn trên bản đồ)
                await Task.Delay(2000, stoppingToken);
            }
        }

        private async Task SimulateDeliveryProcess()
        {
            // Tạo scope mới vì BackgroundService là Singleton, còn UoW là Scoped
            using (var scope = _serviceProvider.CreateScope())
            {
                var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                // 1. Lấy tất cả Delivery đang chạy (StatusID = 1: In Progress)
                // Cần Include: Drone (để update vị trí), Order -> Address (để lấy đích đến), Drone -> Station (lấy điểm xuất phát)
                var activeDeliveries = await uow.Repository<Delivery>()
                    .GetAsync(
                        filter: d => d.StatusID == 1 && d.ActualDropoffTime == null,
                        includeProperties: "Drone,Drone.DroneStation,Order,Order.Address"
                    );

                foreach (var delivery in activeDeliveries)
                {
                    if (delivery.Drone == null || delivery.Order == null) continue;

                    // --- A. XÁC ĐỊNH TỌA ĐỘ ---

                    // Điểm xuất phát: Trạm Drone (Station)
                    // (Nếu bạn muốn xịn hơn: Lưu StartLat/Lng vào Delivery lúc Assign)
                    decimal startLat = delivery.Drone.DroneStation?.Location_Lat ?? 0;
                    decimal startLng = delivery.Drone.DroneStation?.Location_Lng ?? 0;

                    // Điểm đích: Nhà khách hàng
                    // LƯU Ý: Giả định Address đã có Latitude/Longitude
                    decimal endLat = delivery.Order.Address.Latitude;
                    decimal endLng = delivery.Order.Address.Longitude;

                    // --- B. TÍNH TOÁN TIẾN ĐỘ ---

                    var now = DateTime.UtcNow;
                    var startTime = delivery.EstimatedPickupTime ?? now; // Thời gian bắt đầu bay
                    var endTime = delivery.EstimatedDropoffTime ?? now.AddMinutes(10); // Thời gian dự kiến đến

                    var totalDuration = (endTime - startTime).TotalSeconds;
                    var timeElapsed = (now - startTime).TotalSeconds;

                    if (totalDuration <= 0) totalDuration = 1; // Tránh chia cho 0

                    double progressPercent = timeElapsed / totalDuration;

                    // --- C. CẬP NHẬT DRONE ---

                    // 1. Cập nhật tọa độ mới
                    var (newLat, newLng) = GeoHelper.Interpolate(startLat, startLng, endLat, endLng, progressPercent);
                    delivery.Drone.CurrentLocation_Lat = newLat;
                    delivery.Drone.CurrentLocation_Lng = newLng;

                    // 2. Trừ Pin (Giả lập: Cứ mỗi lần chạy worker trừ 0.2%)
                    if (delivery.Drone.CurrentBattery > 0)
                    {
                        delivery.Drone.CurrentBattery -= 0.2m;
                    }

                    // --- D. KIỂM TRA HOÀN THÀNH ---

                    if (progressPercent >= 1.0) // Đã đến nơi
                    {
                        _logger.LogInformation($"Delivery {delivery.DeliveryID} Completed!");

                        // 1. Cập nhật Delivery
                        delivery.ActualDropoffTime = DateTime.UtcNow;
                        delivery.StatusID = 4; // Giả sử 4 là "Completed/Delivered" trong DeliveryStatus

                        // 2. Cập nhật Order
                        var completedOrderStatus = (await uow.Repository<OrderStatus>()
                            .FindAsync(s => s.StatusName == "Delivered")).FirstOrDefault();

                        if (completedOrderStatus != null)
                        {
                            delivery.Order.StatusID = completedOrderStatus.StatusID;
                            uow.Orders.Update(delivery.Order);
                        }

                        // 3. Cập nhật Drone -> Về trạng thái Rảnh (Idle)
                        var idleStatus = (await uow.Repository<DroneStatus>()
                            .FindAsync(s => s.StatusName == "Idle")).FirstOrDefault();

                        if (idleStatus != null)
                        {
                            delivery.Drone.StatusID = idleStatus.StatusID;
                            // Giữ vị trí tại nhà khách (hoặc bạn có thể code logic bay về sau)
                        }
                    }

                    // Update các thay đổi
                    uow.Repository<Drone>().Update(delivery.Drone);
                    uow.Repository<Delivery>().Update(delivery);
                }

                // Lưu tất cả thay đổi xuống DB
                await uow.SaveChangesAsync();
            }
        }
    }
}
