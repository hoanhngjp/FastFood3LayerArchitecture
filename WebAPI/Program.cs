using BUS.Services;
using BUS.Services.AddressService;
using BUS.Services.CartService;
using BUS.Services.DashboardService;
using BUS.Services.DroneService;
using BUS.Services.PaymentService;
using BUS.Services.RestaurantService;
using DAT;
using DAT.Repository;
using DAT.UnitOfWork;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;
using WebAPI.Workers;

var builder = WebApplication.CreateBuilder(args);

Env.Load();

builder.Configuration["ConnectionStrings:DefaultConnection"] = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
builder.Configuration["Jwt:Key"] = Environment.GetEnvironmentVariable("JWT_SECRET");

builder.Configuration["Vnpay:TmnCode"] = Environment.GetEnvironmentVariable("VNPAY_TMNCODE");
builder.Configuration["Vnpay:HashSecret"] = Environment.GetEnvironmentVariable("VNPAY_HASHSECRET");
builder.Configuration["Vnpay:BaseUrl"] = Environment.GetEnvironmentVariable("VNPAY_URL");

var config = builder.Configuration;

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Đăng ký Hosted Service
builder.Services.AddHostedService<DroneSimulatorWorker>();

// CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy
            .WithOrigins("https://localhost:7105")//New
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());//New

});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDistributedMemoryCache();

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30); 
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// ĐĂNG KÝ CÁC SERVICES
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IFoodItemService, FoodItemService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IRestaurantService, RestaurantService>();
builder.Services.AddScoped<IAddressService, AddressService>();
builder.Services.AddScoped<IVnPayService, VnPayService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IDroneService, DroneService>();

builder.Services.AddHttpContextAccessor();
// Thêm dịch vụ "Xác thực"
builder.Services.AddAuthentication(options =>
{
    // Đặt "Bearer" làm chuẩn
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
// Cấu hình Handler của Bearer
.AddJwtBearer(options =>
{
    // A. Cấu hình "Khóa" 
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"])),

        ValidateIssuer = true,
        ValidIssuer = config["Jwt:Issuer"],

        ValidateAudience = true,
        ValidAudience = config["Jwt:Audience"],

        ClockSkew = TimeSpan.Zero // Chuẩn!
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Thử lấy token từ cookie trước
            string? token = context.Request.Cookies["access_token"];

            if (!string.IsNullOrEmpty(token))
            {
                context.Token = token;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseHsts();

app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();

app.UseAuthorization();

app.UseSession();

app.MapControllers();

app.Run();
