import {BookOpen,RefreshCw} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {courseApi} from '@/api/endpoints';
import {Button} from '@/components/common/Button';
import {StatusBadge} from '@/components/common/StatusBadge';

export function StudentCourses(){
  const {data,isLoading,isError,refetch}=useQuery({queryKey:['student-courses'],queryFn:()=>courseApi.all(),refetchInterval:30_000});
  const courses=data?.results??[];
  return <div className="space-y-8 animate-fade-in"><header className="border-b border-glass-border pb-7"><p className="registry-label rule-title">Modules / Enrollment</p><h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">My modules</h1><p className="mt-2 text-sm text-text-muted">Courses assigned to your current level and class enrollments.</p></header>
    {isLoading&&<div className="grid gap-px bg-glass-border sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-52 animate-pulse bg-background-elevated"/>)}</div>}
    {isError&&<div className="border border-glass-border bg-background-elevated p-8 text-center"><p className="font-semibold text-danger">Modules could not be loaded</p><p className="mt-2 text-sm text-text-muted">Make sure the Django backend is running and try again.</p><Button className="mt-5" variant="secondary" onClick={()=>void refetch()} leftIcon={<RefreshCw className="h-4 w-4"/>}>Retry</Button></div>}
    {!isLoading&&!isError&&courses.length===0&&<div className="border-y border-glass-border py-14 text-center"><BookOpen className="mx-auto h-8 w-8 text-text-dim"/><h2 className="mt-4 text-lg font-bold">No modules assigned</h2><p className="mt-2 text-sm text-text-muted">An administrator must enroll you in classes matching your level.</p></div>}
    {!isLoading&&!isError&&courses.length>0&&<div className="grid gap-px border border-glass-border bg-glass-border sm:grid-cols-2 lg:grid-cols-3">{courses.map((course,index)=><article key={course.id} className="flex min-h-52 flex-col justify-between bg-background-elevated p-6 transition-colors hover:bg-primary/5"><div className="flex items-start justify-between"><span className="font-mono text-[10px] text-text-dim">MODULE / {String(index+1).padStart(2,'0')}</span><StatusBadge status="active" size="sm"/></div><div className="my-8"><p className="font-display text-3xl font-extrabold tracking-tight text-primary">{course.code}</p><h2 className="mt-2 text-sm font-semibold leading-5">{course.name}</h2></div><div className="flex items-center justify-between border-t border-glass-border pt-4 font-mono text-[9px] uppercase tracking-widest text-text-dim"><span>{course.level}</span><span>{course.creditHours} units</span><span>{course.semester}</span></div></article>)}</div>}
  </div>;
}
