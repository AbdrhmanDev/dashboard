import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { UserService } from '../../../services/user.service';
import { CreateUserDTO } from '../../../models/user';

@Component({
  selector: 'app-user-create',
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
})
export class UserCreateComponent implements OnInit {
  userForm: FormGroup;
  isSubmitting = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  maxDate = new Date();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.maxDate.setFullYear(this.maxDate.getFullYear() - 18);

    this.userForm = this.fb.group(
      {
        name: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(50),
          ],
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.pattern(/^\S+@\S+\.\S+$/),
          ],
        ],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        phone: ['', [Validators.pattern(/^(01)(0|1|2|5)\d{8}$/)]],
        avatar: [''],
        dateOfBirth: ['', [Validators.required, this.dateOfBirthValidator()]],
        gender: [''],
        address: this.fb.group({
          country: ['', [Validators.required]],
          city: ['', [Validators.required]],
        }),
        role: ['Guest', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  ngOnInit(): void {}

  dateOfBirthValidator() {
    return (control: any) => {
      if (!control.value) return null;
      const age = this.calculateAge(control.value);
      return age >= 18 ? null : { underage: true };
    };
  }

  calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      try {
        const base64String = await this.convertFileToBase64(file);
        this.imagePreview = base64String;
        this.userForm.patchValue({
          avatar: base64String,
        });
      } catch (error) {
        this.snackBar.open('Error processing image', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
        });
      }
    }
  }

  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  onSubmit() {
    if (this.userForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.userForm.value;
      const userData: CreateUserDTO = {
        ...formValue,
        dateOfBirth: formValue.dateOfBirth.toISOString(),
      };

      this.userService.createUser(userData).subscribe({
        next: () => {
          this.snackBar.open('User created successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
          });
          this.router.navigate(['/users']);
        },
        error: (error) => {
          this.snackBar.open('Error creating user: ' + error.message, 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
          });
          this.isSubmitting = false;
        },
      });
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName);
    if (control?.hasError('required')) {
      return `${
        controlName.charAt(0).toUpperCase() + controlName.slice(1)
      } is required`;
    }
    if (
      control?.hasError('email') ||
      (control?.hasError('pattern') && controlName === 'email')
    ) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.getError('minlength').requiredLength;
      return `${
        controlName.charAt(0).toUpperCase() + controlName.slice(1)
      } must be at least ${minLength} characters`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.getError('maxlength').requiredLength;
      return `${
        controlName.charAt(0).toUpperCase() + controlName.slice(1)
      } cannot exceed ${maxLength} characters`;
    }
    if (control?.hasError('pattern') && controlName === 'phone') {
      return 'Please enter a valid Egyptian phone number';
    }
    if (control?.hasError('underage')) {
      return 'User must be at least 18 years old';
    }
    if (
      this.userForm.hasError('mismatch') &&
      controlName === 'confirmPassword'
    ) {
      return 'Passwords do not match';
    }
    return '';
  }
}
