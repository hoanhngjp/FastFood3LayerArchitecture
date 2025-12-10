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

                // Chạy chu kỳ mỗi 2 giây
                await Task.Delay(2000, stoppingToken);
            }
        }

        private async Task SimulateDeliveryProcess()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

                // 1. Lấy tất cả Delivery đang chạy (StatusID = 1: Assigned/In Progress)
                // Include: Drone, DroneStation, Order, Order.Address, Order.Restaurant (MỚI)
                var activeDeliveries = await uow.Repository<Delivery>()
                    .GetAsync(
                        filter: d => d.StatusID == 1 && d.ActualDropoffTime == null,
                        includeProperties: "Drone,Drone.DroneStation,Order,Order.Address,Order.Restaurant"
                    );

                foreach (var delivery in activeDeliveries)
                {
                    if (delivery.Drone == null || delivery.Order == null) continue;

                    var now = DateTime.UtcNow;

                    // --- A. XÁC ĐỊNH 3 ĐIỂM QUAN TRỌNG ---
                    // 1. Trạm (Start Point)
                    decimal stationLat = delivery.Drone.DroneStation?.Location_Lat ?? 0;
                    decimal stationLng = delivery.Drone.DroneStation?.Location_Lng ?? 0;

                    // 2. Nhà hàng (Pickup Point)
                    decimal restLat = delivery.Order.Restaurant?.Location_Lat ?? 0;
                    decimal restLng = delivery.Order.Restaurant?.Location_Lng ?? 0;

                    // 3. Khách hàng (Dropoff Point)
                    decimal custLat = delivery.Order.Address?.Latitude ?? 0;
                    decimal custLng = delivery.Order.Address?.Longitude ?? 0;


                    // --- B. TÍNH TOÁN TIẾN ĐỘ ---
                    var startTime = delivery.EstimatedPickupTime.HasValue
                                    ? delivery.EstimatedPickupTime.Value.AddMinutes(-10) // Lùi lại 10p để lấy mốc lúc bắt đầu bay từ trạm
                                    : now;

                    var pickupTime = delivery.EstimatedPickupTime ?? now.AddMinutes(10); // Thời điểm đến nhà hàng
                    var dropoffTime = delivery.EstimatedDropoffTime ?? now.AddMinutes(30); // Thời điểm đến khách

                    decimal targetLat, targetLng;
                    decimal fromLat, fromLng;
                    double phaseProgress = 0;

                    // --- LOGIC CHIA PHASE ---

                    if (now < pickupTime)
                    {
                        // === PHASE 1: TRẠM -> NHÀ HÀNG ===
                        var durationPhase1 = (pickupTime - startTime).TotalSeconds;
                        var elapsedPhase1 = (now - startTime).TotalSeconds;

                        if (durationPhase1 <= 0) durationPhase1 = 1;
                        phaseProgress = elapsedPhase1 / durationPhase1;

                        // Start: Station -> End: Restaurant
                        fromLat = stationLat; fromLng = stationLng;
                        targetLat = restLat; targetLng = restLng;

                        // (Optional) Update Order Status -> "Picking Up" nếu cần
                    }
                    else
                    {
                        // === PHASE 2: NHÀ HÀNG -> KHÁCH HÀNG ===
                        var durationPhase2 = (dropoffTime - pickupTime).TotalSeconds;
                        var elapsedPhase2 = (now - pickupTime).TotalSeconds;

                        if (durationPhase2 <= 0) durationPhase2 = 1;
                        phaseProgress = elapsedPhase2 / durationPhase2;

                        // Start: Restaurant -> End: Customer
                        fromLat = restLat; fromLng = restLng;
                        targetLat = custLat; targetLng = custLng;

                        // Đảm bảo Order Status là Delivering
                        // (Thực tế nên check status hiện tại trước khi update để tránh spam DB)
                    }

                    // --- C. CẬP NHẬT DRONE ---

                    // 1. Tính tọa độ nội suy
                    // Giới hạn progress max là 1.0 (để không bay lố)
                    if (phaseProgress > 1.0) phaseProgress = 1.0;
                    if (phaseProgress < 0.0) phaseProgress = 0.0;

                    var (newLat, newLng) = GeoHelper.Interpolate(fromLat, fromLng, targetLat, targetLng, phaseProgress);

                    delivery.Drone.CurrentLocation_Lat = newLat;
                    delivery.Drone.CurrentLocation_Lng = newLng;

                    // 2. Trừ Pin (Giả lập)
                    if (delivery.Drone.CurrentBattery > 0)
                    {
                        delivery.Drone.CurrentBattery -= 0.1m; // Trừ ít hơn chút cho thực tế
                    }

                    // --- D. KIỂM TRA HOÀN THÀNH (CHỈ KHI HẾT PHASE 2) ---

                    if (now >= dropoffTime) // Đã đến giờ giao xong
                    {
                        _logger.LogInformation($"Delivery {delivery.DeliveryID} Completed at Customer Location!");

                        // 1. Cập nhật Delivery
                        delivery.ActualDropoffTime = DateTime.UtcNow;
                        delivery.StatusID = 4; // Completed

                        // 2. Cập nhật Order -> Delivered
                        var completedOrderStatus = (await uow.Repository<OrderStatus>()
                            .FindAsync(s => s.StatusName == "Delivered")).FirstOrDefault(); // Hoặc "Success"

                        if (completedOrderStatus != null)
                        {
                            delivery.Order.StatusID = completedOrderStatus.StatusID;
                            uow.Orders.Update(delivery.Order);
                        }

                        // 3. Cập nhật Drone -> Idle (Rảnh)
                        var idleStatus = (await uow.Repository<DroneStatus>()
                            .FindAsync(s => s.StatusName == "Idle")).FirstOrDefault();

                        if (idleStatus != null)
                        {
                            delivery.Drone.StatusID = idleStatus.StatusID;
                        }
                    }

                    // Update
                    uow.Repository<Drone>().Update(delivery.Drone);
                    uow.Repository<Delivery>().Update(delivery);
                }

                await uow.SaveChangesAsync();
            }
        }
    }
}