import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BookingService } from '../../services/booking.service';
import { Booking, Property } from '../../models/booking';
import { RevenueService } from '../../services/revenue.service';

interface RevenueResponse {
  totalRevenue: number;
}

interface PropertyStats {
  count: number;
  revenue: number;
  property: Property;
  title: string;
  lastBooking: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatProgressBarModule,
  ],
})
export class HomeComponent implements OnInit {
  isLoading = true;
  recentBookings: Booking[] = [];
  popularProperties: any[] = [];
  recentActivities: any[] = [];
  bookingStats = {
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    revenue: 0,
  };
  public getRevenue = 0;

  displayedColumns: string[] = [
    'bookingId',
    'guest',
    'property',
    'checkIn',
    'status',
    'amount',
  ];

  constructor(
    private bookingService: BookingService,
    private revenueService: RevenueService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    this.bookingService.getBookings().subscribe({
      next: (bookings) => {
        this.recentBookings = bookings.slice(0, 5);
        this.calculateStats(bookings);
        this.generatePopularProperties(bookings);
        this.generateRecentActivities(bookings);
        this.isLoading = false;

        this.revenueService.getRevenue().subscribe({
          next: (response: RevenueResponse) => {
            this.getRevenue = response.totalRevenue;
          },
          error: (error: any) => {
            console.error('Error loading revenue:', error);
          },
        });
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      },
    });
  }

  private calculateStats(bookings: Booking[]) {
    this.bookingStats.total = bookings.reduce(
      (sum, booking) => sum + booking.properties.length,
      0
    );

    this.bookingStats.completed = bookings.reduce(
      (sum, booking) =>
        sum + booking.properties.filter((p) => p.status === 'completed').length,
      0
    );

    this.bookingStats.pending = bookings.reduce(
      (sum, booking) =>
        sum + booking.properties.filter((p) => p.status === 'pending').length,
      0
    );

    this.bookingStats.cancelled = bookings.reduce(
      (sum, booking) =>
        sum + booking.properties.filter((p) => p.status === 'cancelled').length,
      0
    );

    this.bookingStats.revenue = bookings.reduce((sum, booking) => {
      const confirmedPropertiesRevenue = booking.properties
        .filter((p) => p.status === 'cancelled')
        .reduce((propSum, prop) => propSum + prop.totalPrice, 0);
      return sum + confirmedPropertiesRevenue;
    }, 0);
  }

  private generatePopularProperties(bookings: Booking[]) {
    const propertyStats = new Map<string, PropertyStats>();

    bookings.forEach((booking) => {
      booking.properties.forEach((property) => {
        const propertyId =
          typeof property.propertyId === 'string'
            ? property.propertyId
            : property.propertyId._id;

        const propertyTitle =
          typeof property.propertyId === 'string'
            ? 'Property ' + propertyId.substring(0, 8)
            : property.propertyId.title;

        const current = propertyStats.get(propertyId) || {
          count: 0,
          revenue: 0,
          property: property,
          title: propertyTitle,
          lastBooking: new Date(booking.createdAt || new Date()),
        };

        current.count++;
        current.revenue += property.totalPrice;

        const bookingDate = new Date(booking.createdAt || new Date());
        if (bookingDate > current.lastBooking) {
          current.lastBooking = bookingDate;
        }

        propertyStats.set(propertyId, current);
      });
    });

    this.popularProperties = Array.from(propertyStats.values())
      .sort((a, b) => {
        const countDiff = b.count - a.count;
        if (countDiff !== 0) return countDiff;

        const revenueDiff = b.revenue - a.revenue;
        if (revenueDiff !== 0) return revenueDiff;

        return b.lastBooking.getTime() - a.lastBooking.getTime();
      })
      .slice(0, 4)
      .map((property) => ({
        ...property,
        occupancyRate: (
          (property.count / this.bookingStats.total) *
          100
        ).toFixed(1),
      }));
  }

  private generateRecentActivities(bookings: Booking[]) {
    const activities: any[] = [];

    bookings.forEach((booking) => {
      booking.properties.forEach((property) => {
        const propertyTitle =
          typeof property.propertyId === 'string'
            ? 'Property ' + property.propertyId.substring(0, 8)
            : property.propertyId.title;

        activities.push({
          type: property.status,
          message: `New booking for ${propertyTitle}`,
          time: booking.createdAt,
          amount: property.totalPrice,
        });
      });
    });

    this.recentActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  getTimeAgo(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return 'Just now';
  }

  getPropertyDisplay(
    propertyId: string | { _id: string; title: string } | undefined
  ): string {
    if (!propertyId) return 'N/A';
    if (typeof propertyId === 'string') {
      return 'Property ' + propertyId.substring(0, 8);
    }
    return propertyId.title || 'N/A';
  }

  getUserDisplay(userId: string | { name: string } | undefined): string {
    if (!userId) return 'N/A';
    if (typeof userId === 'string') {
      return 'Guest ' + userId.substring(0, 8);
    }
    return userId.name || 'N/A';
  }
}
