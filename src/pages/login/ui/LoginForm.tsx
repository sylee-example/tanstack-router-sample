import { useForm, Controller } from 'react-hook-form';
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
    control,
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
      {/* antd Input 의 ref는 DOM 노드가 아니라 { focus, blur, input, ... } 형태의 커스텀 핸들 객체다.
          register() 를 직접 스프레드하면 RHF가 제출 시점에 ref.value 를 읽는데 그 값이 항상 undefined라
          입력해도 "아이디를 입력하세요" 검증 에러가 난다. Controller 로 감싸 value/onChange 를 명시적으로 연결한다. */}
      <Controller
        name="username"
        control={control}
        render={({ field }) => <Input id="username" placeholder="이름을 입력하세요" {...field} />}
      />
      {errors.username && <span className="text-sm text-red-600">{errors.username.message}</span>}
      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        로그인
      </Button>
    </form>
  );
};
