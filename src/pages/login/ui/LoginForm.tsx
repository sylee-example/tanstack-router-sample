import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from 'antd';

const schema = z.object({
  username: z.string().min(1, '아이디를 입력하세요'),
});

type LoginValues = z.infer<typeof schema>;

interface LoginFormProps {
  onSubmit: (values: LoginValues) => void;
}

export const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="username" className="text-sm font-medium">
        아이디
      </label>
      <Input id="username" placeholder="이름을 입력하세요" {...register('username')} />
      {errors.username && <span className="text-sm text-red-600">{errors.username.message}</span>}
      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        로그인
      </Button>
    </form>
  );
};
