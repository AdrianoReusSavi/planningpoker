FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["PlanningPoker.Api/PlanningPoker.Api.csproj", "PlanningPoker.Api/"]
COPY ["PlanningPoker.Application/PlanningPoker.Application.csproj", "PlanningPoker.Application/"]
COPY ["PlanningPoker.Domain/PlanningPoker.Domain.csproj", "PlanningPoker.Domain/"]
COPY ["PlanningPoker.Infrastructure/PlanningPoker.Infrastructure.csproj", "PlanningPoker.Infrastructure/"]
RUN dotnet restore "PlanningPoker.Api/PlanningPoker.Api.csproj"
COPY . .
RUN dotnet publish "PlanningPoker.Api/PlanningPoker.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PlanningPoker.Api.dll"]