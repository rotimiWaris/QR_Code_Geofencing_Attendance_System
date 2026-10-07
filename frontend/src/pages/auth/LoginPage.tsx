import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, UserRound, GraduationCap, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/forms/FormInput';
import { PasswordField } from '@/components/forms/PasswordField';
import { cn } from '@/utils';

const roles=[{value:'student',label:'Student',icon:GraduationCap},{value:'lecturer',label:'Lecturer',icon:UserRound},{value:'admin',label:'Admin',icon:ShieldCheck}] as const;
export function LoginPage(){
  const {login}=useAuth(); const {showToast}=useToast(); const navigate=useNavigate(); const [isLoading,setIsLoading]=useState(false);
  const {register,handleSubmit,setValue,watch,formState:{errors}}=useForm<LoginFormData>({resolver:zodResolver(loginSchema),defaultValues:{role:'student'}});
  const role=watch('role');
  const chooseRole=(value:'student'|'lecturer'|'admin')=>setValue('role',value);
  const onSubmit=async(data:LoginFormData)=>{setIsLoading(true);try{await login(data.email,data.password,data.role);showToast('Registry opened','success');navigate(`/${data.role}/dashboard`)}catch{showToast('Check your account details','error')}finally{setIsLoading(false)}};
  return <main className="min-h-screen bg-background">
    <div className="grid min-h-screen lg:grid-cols-[.78fr_1.22fr]">
      <aside className="campus-grid relative hidden border-r border-glass-border bg-primary text-background lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center border border-background font-display font-extrabold">CP</div><div><p className="font-display font-extrabold">Campus Presence</p><p className="font-mono text-[9px] uppercase tracking-[.2em] opacity-70">Digital registry</p></div></div>
        <div><MapPin className="h-8 w-8"/><blockquote className="mt-7 max-w-md font-display text-4xl font-bold leading-tight">Being present should be simple to prove—and easy to understand.</blockquote><p className="mt-6 font-mono text-[10px] uppercase tracking-widest opacity-70">North campus · Registry terminal 04</p></div>
        <p className="text-xs opacity-70">Location is requested only during an active check-in.</p>
      </aside>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-xl">
          <Link to="/" className="mb-12 inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-main"><ArrowLeft className="h-4 w-4"/>Return to campus</Link>
          <p className="registry-label rule-title">Identity / Access</p><h1 className="mt-5 text-4xl font-extrabold tracking-tight">Open your registry</h1><p className="mt-2 text-sm text-text-muted">Select how you belong to the campus, then sign in.</p>
          <div className="mt-8 grid grid-cols-3 border border-glass-border">{roles.map(item=><button type="button" key={item.value} onClick={()=>chooseRole(item.value)} className={cn('flex flex-col items-center gap-2 border-r border-glass-border px-2 py-4 text-xs font-semibold last:border-r-0',role===item.value?'bg-primary text-background':'bg-background-elevated hover:bg-primary/5')}><item.icon className="h-5 w-5"/>{item.label}</button>)}</div>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5 border-y border-glass-border py-8">
            <input type="hidden" {...register('role')}/><FormInput label={role==='student'?'Student email':'Institutional email'} type="email" placeholder="you@university.edu" error={errors.email?.message} {...register('email')}/><PasswordField label="Password" placeholder="Enter your password" error={errors.password?.message} {...register('password')}/>
            <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-text-muted"><input type="checkbox" className="accent-primary"/>Remember this device</label><Link to="/forgot-password" className="text-xs font-semibold text-primary">Forgot password?</Link></div>
            <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>Continue as {role}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-text-muted">Have a verification token? <Link to="/signup" className="font-semibold text-primary">Create an account</Link></p>
        </div>
      </section>
    </div>
  </main>;
}
